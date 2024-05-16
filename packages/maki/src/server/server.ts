import { watch } from "node:fs";
import { basename, format, join, parse, relative, resolve } from "node:path";
import log, { colors } from "@/log";
import Router, { LayoutRoute, PageRoute } from "@/routing/Router";
import type { MakiConfig, Method } from "@/types";
import { createElement, msDeltaTime, pipeToReadableStream } from "@/utils";
import type { Server } from "bun";
import chalk from "chalk";
import { Fragment, type ReactNode, lazy } from "react";
import { createFromNodeStream } from "react-server-dom-esm/client.node";
import { renderServerComponents } from "./react-server-dom";

// TODO: handle head
// TODO: handle endpoints
// TODO: typesafe endpoints
// TODO: error boundaries
// TODO: server actions
// TODO: page not found

const makiBaseDir = `${resolve(import.meta.dir, "../..")}/`;
const sourceFileGlob = new Bun.Glob("**/*.{tsx,jsx,ts,js}");
const routerGlob = new Bun.Glob("**/{page,layout,loading,error,notFound}.{tsx,jsx,ts,js}");
const endpointGlob = new Bun.Glob("**/{server.{ts,js}");
export type ServerOptions = {
    config: MakiConfig;
    cwd: string;
    port?: number;
};

export async function createServer(options: ServerOptions) {
    const startTime = Bun.nanoseconds();

    let build = await buildProject(options, false);
    let router = createRouter(options);

    const server: Server = Bun.serve({
        async fetch(req) {
            const url = new URL(req.url, server.url);
            const method = (req.headers.get("METHOD")?.toUpperCase() as Method) ?? "GET";

            // * SERVER COMPONENTS *
            if (method === "GET" && url.pathname.startsWith("/@maki/jsx/")) {
                const pathname = url.pathname.slice(10);
                const matchingRoute = matchRoute(pathname, url.searchParams, router);
                const stream = await renderServerComponents(matchingRoute, options);
                return new Response(pipeToReadableStream(stream), { headers: { "Content-Type": "text/x-component" } });
            }

            // * SERVER ACTIONS *
            if (method === "POST" && url.pathname.startsWith("/@maki/actions/")) {
                console.log("REACT SERVER ACTION CALLED", url.pathname);
                // handleServerAction(req);
                throw "RSA not implemented :(";
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

            // * SERVER ENDPOINTS *
            const endpoint = !"(url.pathname, method)";
            if (endpoint) {
                const output = "";
                return new Response(JSON.parse(output), { headers: { "Content-Type": "application/json" } });
            }

            if (method !== "GET") {
                return new Response("405 - Method not allowed", { status: 405 });
            }

            // * PUBLIC *
            const publicFile = Bun.file(`${options.cwd}/public${url.pathname}`);
            if (await publicFile.exists()) {
                return new Response(publicFile);
            }

            // * SERVER SIDE RENDER *
            try {
                const matchingRoute = matchRoute(url.pathname, url.searchParams, router);
                const App = createFromNodeStream(
                    await renderServerComponents(matchingRoute, options),
                    `${options.cwd}/.maki/client/`,
                    "/@maki/",
                );

                const { renderToReadableStream } = await import(join(options.cwd, ".maki/client/ssr.js"));
                const stream = await renderToReadableStream(App, req.url, {
                    bootstrapModules: ["/@maki/client"],
                    bootstrapScriptContent: `window.maki = ${JSON.stringify({
                        routes: routerToClient(router) ?? {},
                    })};`,
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
    watcher.addListener("change", async (_, file: string) => {
        log.fileChange(file);
        build = await buildProject(options);
        router = createRouter(options);

        console.log();
        server.publish("hmr", JSON.stringify({ type: "change", pathname: `/${parse(file).dir}` }), true);
    });

    console.log();
    console.log(chalk.hex("#b4befe").bold(" 🍣 Maki"), chalk.dim("v0.0.1"));
    console.log(chalk.hex("#cdd6f4")("  ↪ Local:"), colors.link(`http://${server.hostname}:${server.port}`));
    console.log();

    console.log(chalk.hex("#1e1e2e").bgHex("#a6e3a1")(" Ready "), `in ${msDeltaTime(startTime)}ms`);

    return server;
}

type ReactDirective = "server" | "client";
async function buildProject({ cwd, config }: ServerOptions, logs = true) {
    const startTime = Bun.nanoseconds();
    const clientComponents = new Set<string>();
    const outputs: Record<string, Blob> = {};

    const production = true; // Disabling production disables minifying which triggers a bundling error

    // * Server components * //
    const serverBuild = await Bun.build({
        entrypoints: Array.from(sourceFileGlob.scanSync({ cwd: `${cwd}/src` })).map((s) => `${cwd}/src/${s}`),
        root: `${cwd}/src`,
        sourcemap: production ? "none" : "inline",
        minify: production,

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
                            ? relative(makiBaseDir, path).replace("src/routing", ".maki/_internal")
                            : relative(cwd, path).replace("src", ".maki");
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

                        const directive = file.match(/^[\s\n;]*(["`'])use (client|server)\1/);
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

                        const hash = Bun.hash.cityHash32(args.path);
                        outputs[`/assets/${name}-${hash}${ext}`] = asset;
                        return {
                            contents: `/@maki/assets/${name}-${hash}${ext}`,
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
            join(makiBaseDir, "src/client/client.ts"),
            join(makiBaseDir, "src/server/react-dom.ts"),
        ),
        root: `${cwd}/src`,
        sourcemap: production ? "none" : "inline",
        minify: production,

        target: "browser",
        splitting: true,
        naming: {
            entry: "./@maki/[dir]/[name].[ext]",
            chunk: "./@maki/chunks/[hash].[ext]",
        },

        publicPath: "./",
        plugins: [
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

    const ssrOutpout = clientBuild.outputs.find((o) => o.path.endsWith("/maki/src/server/react-dom.js"));
    if (!ssrOutpout) {
        throw "Build error: Couldnt find the compiled react-dom entry-point.";
    }
    const ssrScript = (await ssrOutpout.text())
        .replace(/"(?:\.{1,2}\/)+(?:[a-zA-Z0-9]+\/)+([a-zA-Z0-9]+\.js)"/g, '"./_internal/$1"')
        .replace(/"(?:[.a-zA-Z0-9]+\/)+?@maki\/(chunks\/[a-zA-Z0-9]+\.js)"/g, '"./$1"');

    Bun.write(join(cwd, ".maki/client/ssr.js"), ssrScript);

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
        if (output === clientOutput || output === ssrOutpout) continue;
        const path = output.path.slice(7);

        const compiledFilePath = resolve(`${cwd}/src`, `.${path}`);
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

        outputs[path] = output;
        Bun.write(join(cwd, ".maki/client", path), output);
    }

    if (logs) log.buildComplete(startTime, "Compilation done");

    return { outputs };
}

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
            const sourcefilePath = format({ ...path, base: path.name });
            parentRoute[path.name] = lazy(() => import(`${cwd}/src/routes/${sourcefilePath}`));
        }
    }

    return router;
}

type ServerEndpoint = () => unknown;
type ReactPage = (props: { params: UrlParams }) => ReactNode;
type ReactLayout = (props: { children: ReactNode; params: UrlParams }) => ReactNode;
type ReactLoading = (props: { children: ReactNode; params: UrlParams }) => ReactNode;
type ReactError = (props: { children: ReactNode; params: UrlParams }) => ReactNode;
type ReactNotFound = (props: { children: ReactNode; params: UrlParams }) => ReactNode;
type RouteFragment = {
    pathname: string;
    page?: ReactPage;
    layout?: ReactLayout;
    loading?: ReactLoading;
    error?: ReactError;
    notFound?: ReactNotFound;
    routes?: Record<string, Route>;
    endpoints?: Record<Method, ServerEndpoint>;
};
type SlugRouteFragment = RouteFragment & { name: string };

type UrlParams = Record<string, string>;
type Route = RouteFragment | SlugRouteFragment;

type ClientRoutes = {
    layout: boolean;
    page: boolean;
    routes?: Record<string, ClientRoutes>;
};
function routerToClient(route: Route): ClientRoutes | null {
    if (!route.page && !route.routes) return null;

    const r: ClientRoutes = {
        page: !!route.page,
        layout: !!route.layout,
    };

    if (route.routes) {
        for (const [url, subroute] of Object.entries(route.routes)) {
            const clientSubroute = routerToClient(subroute);
            if (!clientSubroute) continue;
            if (!r.routes) r.routes = {};
            r.routes[url] = clientSubroute;
        }
    }

    return r;
}

function createReactTree(router: Route, pathname: string) {
    function routeToReact(route: Route, url: string): ReactNode {
        if (!route.page && !route.routes) return null;

        const subroutes = route.routes
            ? Object.entries(route.routes).map(([dir, subroute]) => routeToReact(subroute, url + dir))
            : null;
        const page = route.page
            ? createElement(PageRoute, { url, children: createElement(route.page, { params: {} }) })
            : null;

        const children = subroutes ? subroutes.concat(page) : page;
        if (!route.layout) return createElement(Fragment, { key: url, children });
        return createElement(LayoutRoute, {
            url,
            key: url,
            children: createElement(route.layout, { params: {}, children }),
        });
    }

    return createElement(Router, { initial: { pathname }, children: routeToReact(router, "") });
}

export type MatchingRoute = { pathname: string; pageStructure: PageStructure; props: PageProps };
export type PageStructure = { pathname: string; layout?: boolean; loading?: boolean; error?: boolean }[];
export type PageProps = { searchParams: Record<string, string | string[]>; params: Record<string, string> };
function matchRoute(pathname: string, searchParams: URLSearchParams, router: Route): MatchingRoute {
    const pathFragments = getPathnameFragments(pathname);

    type Slugs = [number, string][];
    let matchingRoute: { pathname: string; slugs: Slugs } | undefined;
    const searchPossibleRoutes = (route: Route, depth = 0, slugs: Slugs = []) => {
        if (pathFragments.length === depth + 1 && route.page) {
            if (!matchingRoute) {
                matchingRoute = { pathname: route.pathname, slugs };
                return;
            }

            for (let i = 0; i < matchingRoute.slugs.length && i < slugs.length; i++) {
                if (slugs[i][0] < matchingRoute.slugs[i][0]) return;
                if (slugs[i][0] > matchingRoute.slugs[i][0]) {
                    matchingRoute = { pathname: route.pathname, slugs };
                }
            }

            if (slugs.length < matchingRoute.slugs.length) {
                matchingRoute = { pathname: route.pathname, slugs };
            }
            return;
        }

        if (!route.routes) return undefined;
        for (const [subroutePathFrag, subroute] of Object.entries(route.routes)) {
            if (routeIsSlug(subroute)) {
                searchPossibleRoutes(subroute, depth + 1, [...slugs, [depth + 1, subroute.name]]);
            } else if (subroutePathFrag === pathFragments.at(depth + 1)) {
                searchPossibleRoutes(subroute, depth + 1, slugs);
            }
        }
    };
    searchPossibleRoutes(router);

    if (!matchingRoute) throw "404";

    const pageStructure: PageStructure = [];
    getPathnameFragments(matchingRoute.pathname).reduce(
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

    return {
        pathname: matchingRoute.pathname,
        pageStructure,
        props: {
            searchParams: Object.fromEntries(
                Array.from(searchParams.keys()).map((k) => {
                    const value = searchParams.getAll(k).map(decodeURIComponent);
                    return [k, value.length === 1 ? value[0] : value];
                }),
            ),
            params: Object.fromEntries(
                matchingRoute.slugs.map(([depth, name]) => [name, decodeURIComponent(pathFragments[depth].slice(1))]),
            ),
        },
    };
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
