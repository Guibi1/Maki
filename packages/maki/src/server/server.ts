import { readFileSync, watch } from "node:fs";
import { basename, format, join, parse, relative, resolve } from "node:path";
import log, { colors } from "@/log";
import { createElement, msDeltaTime, pipeToReadableStream, searchParamsToObj } from "@/utils";
import type { Server } from "bun";
import chalk from "chalk";
import { renderToReadableStream } from "react-dom/server";
import { createFromNodeStream } from "react-server-dom-esm/client.node";
import type { MakiConfig } from "../types";
import { handleServerEndpoint, writeGlobalApiEndpointsTypes } from "./endpoints/server-endpoints";
import { type HttpMethod, isHttpMethod } from "./endpoints/types";
import { handleServerAction, renderServerComponents } from "./react-server-dom";

// TODO: handle head
// TODO: error boundaries
// TODO: server actions

const makiBaseDir = `${resolve(import.meta.dir, "../..")}/`;
export type ServerOptions = {
    config: MakiConfig;
    cwd: string;
    port?: number;
};

export async function createServer(options: ServerOptions) {
    const startTime = Bun.nanoseconds();

    let build = await buildProject(options, false);
    let router = createRouter(options);
    writeGlobalApiEndpointsTypes(router, options);

    const server: Server = Bun.serve({
        async fetch(req) {
            const url = new URL(req.url, server.url);
            const method = req.method as HttpMethod;
            if (url.pathname === "/favicon.ico") return new Response();

            // * SERVER COMPONENTS *
            if (method === "GET" && url.pathname.startsWith("/@maki/jsx/")) {
                const pathname = url.pathname.slice(10);

                const matchingRoute = matchRoute(pathname, method, url.searchParams, router);
                if (matchingRoute.type === "endpoint") {
                    return new Response("404", { status: 404 });
                }

                const pageStructure = getRoutePageStructure(matchingRoute, router);
                const stream = await renderServerComponents(matchingRoute, pageStructure, build.stylesheets, options);
                return new Response(pipeToReadableStream(stream), { headers: { "Content-Type": "text/x-component" } });
            }

            // * SERVER ACTIONS *
            if (method === "POST" && url.pathname === "/@maki/actions") {
                console.log("REACT SERVER ACTION CALLED", url.pathname);
                const stream = await handleServerAction(req, options);
                return new Response(pipeToReadableStream(stream), { headers: { "Content-Type": "text/x-component" } });
            }

            // * BUILD *
            if (method === "GET" && url.pathname.startsWith("/@maki/")) {
                const pathname = url.pathname.slice(6);
                if (pathname === "/ws") {
                    if (server.upgrade(req)) return;
                    return new Response("WebSocket upgrade failed", { status: 400 });
                }

                const output = build.outputs[pathname];
                if (output) {
                    return new Response(output);
                }

                return new Response("404", { status: 404 });
            }

            log.request(method, url);

            // * PUBLIC *
            const publicFile = Bun.file(`${options.cwd}/public${url.pathname}`);
            if (method === "GET" && (await publicFile.exists())) {
                return new Response(publicFile);
            }

            const matchingRoute = matchRoute(url.pathname, method, url.searchParams, router);

            // * SERVER ENDPOINTS *
            if (matchingRoute.type === "endpoint") {
                const module = await import(join(options.cwd, "src/routes", matchingRoute.pathname, "server"));
                const endpoint = module[method];

                return await handleServerEndpoint(endpoint, matchingRoute, req);
            }

            if (method !== "GET") {
                return new Response("405 - Method not allowed", { status: 405, headers: { Allow: "GET" } });
            }

            // * SERVER SIDE RENDER *
            try {
                const pageStructure = getRoutePageStructure(matchingRoute, router);
                const App = createFromNodeStream(
                    await renderServerComponents(matchingRoute, pageStructure, build.stylesheets, options),
                    `${options.cwd}/.maki/client/`,
                    "/@maki/",
                );

                const { default: MakiShell } = await import(join(options.cwd, ".maki/client/_internal/MakiShell.js"));
                const page = createElement(MakiShell, {
                    router: { initial: { pathname: url.pathname } },
                    children: App,
                });

                const stream = await renderToReadableStream(page, {
                    bootstrapModules: ["/@maki/client"],
                    bootstrapScriptContent: `window.maki = ${JSON.stringify({})};`,
                });

                return new Response(stream, { headers: { "Content-Type": "text/html" } });
            } catch (e) {
                console.error(e);
                throw "Render error: invalid React component";
            }
        },
        websocket: {
            open(ws) {
                ws.subscribe("hmr");
                log.hmr("Client connected");
            },
            close(ws, code, message) {
                log.hmr("Client disconnected");
            },
            message(ws, message) {
                // ws.sendText("test", true);
            },
        },
        port: options.port,
    });

    const watcher = watch(`${options.cwd}/src`, { recursive: true });
    watcher.addListener("change", async (_, fileName: string) => {
        if (fileName === "api.d.ts") return;

        log.fileChange(fileName);
        build = await buildProject(options);
        router = createRouter(options);
        writeGlobalApiEndpointsTypes(router, options);

        console.log();
        server.publish("hmr", JSON.stringify({ type: "change", pathname: `/${parse(fileName).dir}` }), true);
    });

    console.log();
    console.log(chalk.hex("#b4befe").bold(" 🍣 Maki"), chalk.dim("v0.0.1"));
    console.log(chalk.hex("#cdd6f4")("  ↪ Local:"), colors.link(`http://${server.hostname}:${server.port}`));
    console.log();

    console.log(chalk.hex("#1e1e2e").bgHex("#a6e3a1")(" Ready "), `in ${msDeltaTime(startTime)}ms`);

    return server;
}

type ReactDirective = "server" | "client";
const sourceFileGlob = new Bun.Glob("**/*.{tsx,jsx,ts,js}");
async function buildProject({ cwd, config }: ServerOptions, logs = true) {
    const startTime = Bun.nanoseconds();
    const clientComponents = new Set<string>();
    const outputs: Record<string, Blob> = {};
    const stylesheets: string[] = [];

    const production = false;

    // * Server components * //
    const serverBuild = await Bun.build({
        entrypoints: Array.from(sourceFileGlob.scanSync({ cwd: `${cwd}/src` })).map((s) => `${cwd}/src/${s}`),
        root: `${cwd}/src`,
        sourcemap: production ? "none" : "inline",
        minify: true, // Disabling minifying triggers a bundling error
        external: production ? undefined : ["react", "react-dom"],

        outdir: join(cwd, ".maki"),
        target: "browser",
        splitting: true,
        naming: {
            entry: "./src/[dir]/[name].[ext]",
            chunk: "./chunks/[hash].[ext]",
        },

        plugins: [
            {
                name: "Maki React Register",
                setup(build) {
                    function exportToJsx(exportName: string, path: string, directive: ReactDirective) {
                        const isInternalMakiFile = path.startsWith(makiBaseDir);

                        const exportPath = isInternalMakiFile
                            ? relative(makiBaseDir, path).replace("src/components", ".maki/_internal")
                            : relative(cwd, path).replace("src", ".maki/src");
                        const id = `${removeFileExtension(exportPath)}.js#${exportName}`;
                        const mod = `${exportName === "default" ? parse(path).name : ""}_${exportName}`;
                        if (directive === "server") {
                            // In case the of a server components, we add properties to a mock up function to avoid shipping the code to the client
                            return `const ${mod}=()=>{throw new Error("This function is expected to only run on the server")};${mod}.$$typeof=Symbol.for("react.server.reference");${mod}.$$id="${id}";${mod}.$$bound=null; export {${mod} as ${exportName}};`;
                        }

                        clientComponents.add(path);
                        return `const ${mod}={$$typeof:Symbol.for("react.client.reference"),$$id:"${id}",$$async:true}; export {${mod} as ${exportName}};`;
                    }

                    const transpiler = new Bun.Transpiler({ loader: "tsx" });

                    build.onLoad({ filter: /\.[tj]sx?$/ }, async (args) => {
                        const file = await Bun.file(args.path).text();

                        const directive = file.match(/^[\s\n;]*(["`'])use (client)\1/);
                        if (!directive) return { contents: file }; // If there are no directives, we let it be bundled

                        const { exports } = transpiler.scan(file);
                        if (exports.length === 0) return { contents: file }; // If there are no exports, we also let it be bundled

                        return {
                            contents: exports
                                .map((e) => exportToJsx(e, args.path, directive[2] as ReactDirective))
                                .join("\n"),
                        };
                    });
                },
            },
            {
                name: "Maki Asset Handler",
                setup(build) {
                    build.onLoad({ filter: /.+/ }, async (args) => {
                        if (args.namespace !== "file" || !["css", "js", "file"].includes(args.loader)) return;

                        const { name, ext } = parse(args.path);

                        const asset = await config.plugins
                            .filter((plugin) => args.path.match(plugin.filter))
                            .reduce<Promise<Blob>>(
                                (blob, plugin) => blob.then((blob) => plugin.modify(blob, args.path)),
                                Promise.resolve(Bun.file(args.path)),
                            );

                        const hash = Bun.hash.cityHash32(await asset.arrayBuffer());
                        const url = `/@maki/assets/${name}-${hash}${ext}`;
                        outputs[`/assets/${name}-${hash}${ext}`] = asset;

                        if (ext === ".css") stylesheets.push(url);
                        return {
                            contents: url,
                            loader: "text",
                        };
                    });
                },
            },
        ],
    });

    if (!serverBuild.success) {
        console.error("Server build failed");
        throw new AggregateError(serverBuild.logs, "Server build failed");
    }

    // * Client components * //
    const clientBuild = await Bun.build({
        entrypoints: Array.from(clientComponents).concat(
            join(makiBaseDir, "src/components/MakiShell.tsx"),
            join(makiBaseDir, "src/client/client.ts"),
        ),
        root: `${cwd}/src`,
        sourcemap: production ? "none" : "inline",
        minify: true, // Disabling minifying triggers a bundling error
        external: production ? undefined : ["react", "react-dom"],

        target: "browser",
        splitting: true,
        naming: {
            entry: "./@maki/src/[dir]/[name].[ext]",
            chunk: "./@maki/chunks/[hash].[ext]",
        },

        publicPath: "./",
        plugins: [
            {
                name: "Maki React Register",
                setup(build) {
                    function exportToJsx(exportName: string, path: string) {
                        const isInternalMakiFile = path.startsWith(makiBaseDir);

                        const exportPath = isInternalMakiFile
                            ? relative(makiBaseDir, path).replace("src/components", ".maki/_internal")
                            : relative(cwd, path).replace("src", ".maki/src");
                        const id = `${removeFileExtension(exportPath)}.js#${exportName}`;
                        const mod = `${exportName === "default" ? parse(path).name : ""}_${exportName}`;

                        // In case the of a server components, we add properties to a mock up function to avoid shipping the code to the client
                        return `const ${mod}={};${mod}.$$typeof=Symbol.for("react.server.reference");${mod}.$$id="${id}";${mod}.$$bound=null; export {${mod} as ${exportName}};`;
                    }

                    const transpiler = new Bun.Transpiler({ loader: "tsx" });

                    build.onLoad({ filter: /\.[tj]sx?$/ }, async (args) => {
                        const file = await Bun.file(args.path).text();

                        const directive = file.match(/^[\s\n;]*(["`'])use server\1/);
                        if (!directive) return { contents: file }; // If there are no directives, we let it be bundled

                        const { exports } = transpiler.scan(file);
                        if (exports.length === 0) return { contents: file }; // If there are no exports, we also let it be bundled

                        return {
                            contents: exports.map((e) => exportToJsx(e, args.path)).join("\n"),
                        };
                    });
                },
            },
            {
                name: "Maki Asset Handler",
                setup(build) {
                    build.onLoad({ filter: /.+/ }, (args) => {
                        if (args.namespace !== "file" || !["css", "js", "file"].includes(args.loader)) return;

                        const { name, ext } = parse(args.path);
                        const hash = Bun.hash.cityHash32(args.path);
                        outputs[`/assets/${name}-${hash}${ext}`] = Bun.file(args.path);
                        return {
                            contents: `/@maki/assets/${name}-${hash}${ext}`,
                            loader: "text",
                        };
                    });
                },
            },
        ],
    });

    if (!clientBuild.success) {
        console.error("Client build failed");
        throw new AggregateError(clientBuild.logs, "Client build failed");
    }

    const clientOutput = clientBuild.outputs.find((o) => o.path.endsWith("/maki/src/client/client.js"));
    if (!clientOutput) {
        throw "Build error: Couldnt find the client entry-point.";
    }
    outputs["/client"] = new Blob(
        [
            (await clientOutput.text())
                .replace(/"(?:\.{1,2}\/)+(?:[a-zA-Z0-9]+\/)+([a-zA-Z0-9]+\.js)"/g, '"/@maki/_internal/$1"')
                .replace(/"(?:[.a-zA-Z0-9]+\/)+?(@maki\/chunks\/[a-z0-9]+\.js)"/g, '"/$1"'),
        ],
        { type: "text/javascript" },
    );

    for (const output of clientBuild.outputs) {
        if (output === clientOutput) continue;
        const path = output.path.slice(7);

        const compiledFilePath = resolve(`${cwd}`, `.${path}`);
        if (compiledFilePath.startsWith(makiBaseDir)) {
            // Is internal maki source file

            const source = (await output.text()).replace(
                /"(?:[.a-z0-9]+\/)+?@maki\/(chunks\/[a-z0-9]+\.js)"/g,
                '"../$1"',
            );

            Bun.write(join(cwd, `.maki/client/_internal/${basename(path)}`), source);
            outputs[`/_internal/${basename(path)}`] = new Blob([source], { type: "text/javascript" });
            continue;
        }

        const source = (await output.text()).replace(
            /"(?:\.{1,2}\/)+maki\/src\/[a-zA-Z0-9]+\/([a-zA-Z0-9]+\.js)"/g,
            '"./../_internal/$1"',
        );

        Bun.write(join(cwd, ".maki/client", path), source);
        outputs[path] = new Blob([source], { type: "text/javascript" });
    }

    if (logs) log.buildComplete(startTime, "Compilation done");

    return { outputs, stylesheets };
}

const transpiler = new Bun.Transpiler();
const routerGlob = new Bun.Glob("**/{page,layout,loading,error,notFound,server}.{tsx,jsx,ts,js}");
function createRouter({ cwd }: ServerOptions) {
    const files = Array.from(routerGlob.scanSync({ cwd: `${cwd}/src/routes` })).map(parse);
    const router: RouteFragment = { pathname: "/" };

    for (const path of files) {
        const dir = path.dir.split("/").map((p) => `/${p}`);

        const parentRoute: Route = dir.reduce((parent, path, i) => {
            if (path === "/") return parent;
            if (!parent.routes) {
                parent.routes = {};
            }

            if (!(path in parent.routes)) {
                parent.routes[path] = { pathname: dir.slice(0, i + 1).join("") };

                const slugMatch = path.match(/^\/\[(.*)\]$/);
                if (slugMatch) {
                    Object.assign(parent.routes[path], { name: slugMatch[1] });
                }
            }

            return parent.routes[path];
        }, router);

        if (
            path.name === "page" ||
            path.name === "layout" ||
            path.name === "loading" ||
            path.name === "error" ||
            path.name === "notFound"
        ) {
            parentRoute[path.name] = true;
        } else if (path.name === "server") {
            const { exports } = transpiler.scan(readFileSync(join(cwd, "src/routes", path.dir, path.base)));
            parentRoute.endpoints = new Set<HttpMethod>(exports.filter(isHttpMethod));
        }
    }

    if (!router.notFound) {
        console.warn("Not having a root `notFound.tsx` will lead to a RUNTIME crash.");
    }

    return router;
}

export type RouteFragment = {
    pathname: string;
    page?: true;
    layout?: true;
    loading?: true;
    error?: true;
    notFound?: true;
    routes?: Record<string, Route>;
    endpoints?: Set<HttpMethod>;
};
type SlugRouteFragment = RouteFragment & { name: string };
type Route = RouteFragment | SlugRouteFragment;

export type MatchingRoute = { pathname: string; props: PageProps; type: "page" | "endpoint" | "notFound" };
export type PageProps = { searchParams: Record<string, string | string[]>; params: Record<string, string> };
function matchRoute(pathname: string, method: HttpMethod, searchParams: URLSearchParams, router: Route): MatchingRoute {
    const pathFragments = getPathnameFragments(pathname.endsWith("/") ? pathname.slice(0, -1) || "/" : pathname);

    type Match = { pathname: string; slugs: [number, string][]; type: "page" | "endpoint" | "notFound" };
    let matchingRoute: Match | undefined;
    let matchingPageNotFound: Match & { depth: number } = { pathname: "/", slugs: [], type: "notFound", depth: 0 };

    const searchPossibleRoutes = (route: Route, depth = 0, slugs: Match["slugs"] = []) => {
        if (pathFragments.length === depth + 1 && ((method === "GET" && route.page) || route.endpoints?.has(method))) {
            const type = method === "GET" && route.page ? "page" : "endpoint";

            if (!matchingRoute) {
                matchingRoute = { pathname: route.pathname, slugs, type };
                return;
            }

            for (let i = 0; i < matchingRoute.slugs.length && i < slugs.length; i++) {
                if (slugs[i][0] < matchingRoute.slugs[i][0]) return;
                if (slugs[i][0] > matchingRoute.slugs[i][0]) {
                    matchingRoute = { pathname: route.pathname, slugs, type };
                }
            }

            if (slugs.length < matchingRoute.slugs.length) {
                matchingRoute = { pathname: route.pathname, slugs, type };
            }
            return;
        }

        if (route.notFound && route.pathname !== matchingPageNotFound.pathname) {
            for (let i = 0; i < matchingPageNotFound.slugs.length && i < slugs.length; i++) {
                if (slugs[i][0] < matchingPageNotFound.slugs[i][0]) return;
                if (slugs[i][0] > matchingPageNotFound.slugs[i][0]) {
                    matchingPageNotFound = { pathname: route.pathname, slugs, depth, type: "notFound" };
                }
            }

            if (depth > matchingPageNotFound.depth) {
                matchingPageNotFound = { pathname: route.pathname, slugs, depth, type: "notFound" };
            } else if (slugs.length < matchingPageNotFound.slugs.length) {
                matchingPageNotFound = { pathname: route.pathname, slugs, depth, type: "notFound" };
            }
        }

        if (!route.routes) return;
        for (const [subroutePathFrag, subroute] of Object.entries(route.routes)) {
            if (routeIsSlug(subroute)) {
                searchPossibleRoutes(subroute, depth + 1, [...slugs, [depth + 1, subroute.name]]);
            } else if (subroutePathFrag === pathFragments.at(depth + 1)) {
                searchPossibleRoutes(subroute, depth + 1, slugs);
            }
        }
    };
    searchPossibleRoutes(router);

    if (!matchingRoute) {
        matchingRoute = matchingPageNotFound;
    }

    return {
        pathname: matchingRoute.pathname,
        type: matchingRoute.type,
        props: {
            searchParams: searchParamsToObj(searchParams),
            params: Object.fromEntries(
                matchingRoute.slugs.map(([depth, name]) => [name, decodeURIComponent(pathFragments[depth].slice(1))]),
            ),
        },
    };
}

export type PageStructure = { pathname: string; layout: boolean; loading: boolean; error: boolean }[];
function getRoutePageStructure({ pathname }: MatchingRoute, router: Route): PageStructure {
    const pageStructure: PageStructure = [];

    getPathnameFragments(pathname).reduce(
        ({ route, ...prev }, pathFragment, i, pathFragments) => {
            const pathname = i === 1 ? pathFragment : prev.pathname + pathFragment;
            pageStructure.push({
                pathname,
                layout: !!route.layout,
                loading: !!route.loading,
                error: !!route.error,
            });
            if (i + 1 === pathFragments.length) return { route, pathname };
            if (!route.routes) throw "This can't happen!";
            return { route: route.routes[pathFragments[i + 1]], pathname };
        },
        {
            pathname: "",
            route: router,
        },
    );

    return pageStructure;
}

function routeIsSlug(route: Route): route is SlugRouteFragment {
    return "name" in route;
}

/**
 * Removes the file extension of a path, if it has one.
 * @param path The path to parse
 * @returns The path without the file extension
 */
export function removeFileExtension(path: string) {
    const parsed = parse(path);
    return format({ ...parsed, base: parsed.name });
}

function getPathnameFragments(pathname: string) {
    if (pathname === "/") return ["/"];
    return pathname.split("/").map((s) => `/${s}`);
}
