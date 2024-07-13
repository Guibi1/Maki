import { readFileSync, watch } from "node:fs";
import { dirname, join, parse } from "node:path";
import type { MakiDevCliOptions } from "@/bin/maki";
import log, { colors } from "@/log";
import { handleServerAction, renderServerComponents } from "@/react-server/react-server-dom";
import { getMakiBaseDir, msDeltaTime, pipeToReadableStream, searchParamsToObj } from "@/utils";
import type { Server } from "bun";
import chalk from "chalk";
import type { ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import { createFromNodeStream } from "react-server-dom-esm/client.node";
import { handleServerEndpoint, writeGlobalApiEndpointsTypes } from "./endpoints/server-endpoints";
import { type HttpMethod, isHttpMethod } from "./endpoints/types";

// TODO: handle head
// TODO: error boundaries
// TODO: server actions

export function createServer(options: MakiDevCliOptions) {
    const startTime = Bun.nanoseconds();
    let router = createRouter(options);

    const server: Server = Bun.serve({
        async fetch(req) {
            const url = new URL(req.url, server.url);
            const method = req.method as HttpMethod;

            // * CLIENT WEBSOCKET *
            if (method === "GET" && url.pathname.startsWith("/@maki/ws")) {
                if (server.upgrade(req)) return;
                return new Response("WebSocket upgrade failed", { status: 400 });
            }

            // * SERVER COMPONENTS *
            if (method === "GET" && url.pathname.startsWith("/@maki/jsx/")) {
                const pathname = url.pathname.slice(10);

                const matchingRoute = matchRoute(pathname, method, url.searchParams, router);
                if (matchingRoute.type === "endpoint") {
                    return new Response("404", { status: 404 });
                }

                const pageStructure = getRoutePageStructure(matchingRoute, router);
                const stream = await renderServerComponents(matchingRoute, pageStructure, options);
                return new Response(pipeToReadableStream(stream), { headers: { "Content-Type": "text/x-component" } });
            }

            // * SERVER ACTIONS *
            if (method === "POST" && url.pathname === "/@maki/actions") {
                console.log("REACT SERVER ACTION CALLED", url.pathname);
                const stream = await handleServerAction(req, options);
                return new Response(pipeToReadableStream(stream), { headers: { "Content-Type": "text/x-component" } });
            }

            // * FILE SYSTEM *
            if (
                method === "GET" &&
                (url.pathname.startsWith("/@maki-fs/") || url.pathname.startsWith("/@maki/client"))
            ) {
                const path = url.pathname.startsWith("/@maki/client")
                    ? `${getMakiBaseDir()}/src/client/client.ts`
                    : url.pathname.slice(10);

                if (!path.match(/\.[cm]?[jt]sx?$/)) {
                    const asset = await options.config.plugins
                        .filter((plugin) => path.match(plugin.filter))
                        .reduce<Promise<Blob>>(
                            (blob, plugin) => blob.then((blob) => plugin.tranform(blob, path)),
                            Promise.resolve(Bun.file(path)),
                        );

                    return new Response(asset);
                }

                const build = await Bun.build({
                    entrypoints: [path],
                    external: [
                        "react",
                        "react-dom",
                        "react-server-dom-esm",
                        `${getMakiBaseDir()}/src/components/Router`,
                        `${getMakiBaseDir()}/src/components/MakiShell`,
                        `${getMakiBaseDir()}/src/components/Link`,
                    ],
                    target: "browser",
                    format: "esm",
                    sourcemap: "inline",
                    splitting: false,
                });

                if (!build.success) {
                    console.error("Module build failed", path);
                    throw new AggregateError(build.logs, "Module build failed");
                }

                const importDir = dirname(path);
                const transpiled = await build.outputs[0].text();
                const source = transpiled
                    .replace(
                        //? import * as React from "react";
                        //? import React from "react";
                        /import\s*(?:\*\s*as)?\s*([^\s{}]*?)\s*from\s*"(.+?)"\s*;/g,
                        (match: string, name: string, moduleName: string) => {
                            const path = Bun.resolveSync(moduleName, importDir);

                            return `import ${name} from"/@maki-fs/${path}";`;
                        },
                    )
                    .replace(
                        //? import { version as v } from "react";
                        /import\s*({\s*[\w\s, $]+\s*})?\s*from\s*"(react.*?)"\s*;/g,
                        (match: string, namedImports: string, moduleName: string) => {
                            const path = Bun.resolveSync(moduleName, importDir);
                            const name =
                                path === "/home/guibi/Git/maki/packages/maki/src/components/Router.tsx"
                                    ? 20
                                    : Math.round(Math.random() * 10000);

                            return `import mod${name} from"/@maki-fs/${path}"; const ${namedImports.replaceAll(" as", ":")}=mod${name};`;
                        },
                    )
                    .replace(
                        //? import { useRouter as u } from "maki";
                        /import\s*({\s*[\w\s, $]+\s*})?\s*from\s*"(.+?)"\s*;/g,
                        (match: string, namedImports: string, moduleName: string) => {
                            const path = Bun.resolveSync(moduleName, importDir);

                            return `import ${namedImports} from"/@maki-fs/${path}";`;
                        },
                    );

                return new Response(source, { headers: { "Content-Type": "application/javascript" } });
            }

            // // * BUILD *
            // if (method === "GET" && url.pathname.startsWith("/@maki/")) {
            //     const pathname = url.pathname.slice(6);

            //     const output = build.outputs[pathname];
            //     if (output) {
            //         return new Response(output);
            //     }

            //     return new Response("404", { status: 404 });
            // }

            log.request(method, url);

            // * PUBLIC *
            const publicFile = Bun.file(`${options.cwd}/public${url.pathname}`);
            if (method === "GET" && (await publicFile.exists())) {
                return new Response(publicFile);
            }

            const matchingRoute = matchRoute(url.pathname, method, url.searchParams, router);

            // * SERVER ENDPOINTS *
            if (matchingRoute.type === "endpoint") {
                const module = await import(join(options.cwd, "src/routes", matchingRoute.path, "server"));
                const endpoint = module[method];

                return await handleServerEndpoint(endpoint, matchingRoute, req);
            }

            if (method !== "GET") {
                return new Response("405 - Method not allowed", { status: 405, headers: { Allow: "GET" } });
            }

            // * SERVER SIDE RENDER *
            try {
                const pageStructure = getRoutePageStructure(matchingRoute, router);
                const page: ReactNode = createFromNodeStream(
                    await renderServerComponents(matchingRoute, pageStructure, options),
                    "",
                    "/@maki-fs/",
                );

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

        delete require.cache[join(options.cwd, "src", fileName)];
        router = createRouter(options);

        console.log();
        server.publish("hmr", JSON.stringify({ type: "change", pathname: `/${parse(fileName).dir}` }), true);
    });

    console.log();
    console.log(chalk.hex("#b4befe").bold(" 🍣 Maki"), colors.dim("v0.0.1"));
    console.log("  ↪ Local:", colors.link(`http://${server.hostname}:${server.port}`));
    console.log();

    console.log(colors.bgGreen(" Ready "), `in ${msDeltaTime(startTime)}ms`);

    return server;
}

const transpiler = new Bun.Transpiler();
const routerGlob = new Bun.Glob("**/{page,layout,loading,error,notFound,server}.{tsx,jsx,ts,js}");
function createRouter(options: MakiDevCliOptions) {
    const files = Array.from(routerGlob.scanSync({ cwd: `${options.cwd}/src/routes` })).map(parse);
    const router: RouteFragment = { path: "/" };

    for (const path of files) {
        const dir = path.dir.split("/").map((p) => `/${p}`);

        const parentRoute: Route = dir.reduce((parent, path, i) => {
            if (path === "/") return parent;
            if (!parent.routes) {
                parent.routes = {};
            }

            if (!(path in parent.routes)) {
                parent.routes[path] = { path: dir.slice(0, i + 1).join("") };

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
            const { exports } = transpiler.scan(readFileSync(join(options.cwd, "src/routes", path.dir, path.base)));
            parentRoute.endpoints = new Set<HttpMethod>(exports.filter(isHttpMethod));
        }
    }

    if (!router.notFound) {
        console.warn("Not having a root `notFound.tsx` will lead to a RUNTIME crash.");
    }

    writeGlobalApiEndpointsTypes(router, options);
    return router;
}

export type RouteFragment = {
    path: string;
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

export type MatchingRoute = {
    pathname: string;
    path: string;
    props: PageProps;
    type: "page" | "endpoint" | "notFound";
};
export type PageProps = { searchParams: Record<string, string | string[]>; params: Record<string, string> };
function matchRoute(pathname: string, method: HttpMethod, searchParams: URLSearchParams, router: Route): MatchingRoute {
    const pathFragments = getPathnameFragments(pathname.endsWith("/") ? pathname.slice(0, -1) || "/" : pathname);

    type Match = { path: string; slugs: [number, string][]; type: "page" | "endpoint" | "notFound" };
    let matchingRoute: Match | undefined;
    let matchingPageNotFound: Match & { depth: number } = { path: "/", slugs: [], type: "notFound", depth: 0 };

    const searchPossibleRoutes = (route: Route, depth = 0, slugs: Match["slugs"] = []) => {
        if (pathFragments.length === depth + 1 && ((method === "GET" && route.page) || route.endpoints?.has(method))) {
            const type = method === "GET" && route.page ? "page" : "endpoint";

            if (!matchingRoute) {
                matchingRoute = { path: route.path, slugs, type };
                return;
            }

            for (let i = 0; i < matchingRoute.slugs.length && i < slugs.length; i++) {
                if (slugs[i][0] < matchingRoute.slugs[i][0]) return;
                if (slugs[i][0] > matchingRoute.slugs[i][0]) {
                    matchingRoute = { path: route.path, slugs, type };
                }
            }

            if (slugs.length < matchingRoute.slugs.length) {
                matchingRoute = { path: route.path, slugs, type };
            }
            return;
        }

        if (route.notFound && route.path !== matchingPageNotFound.path) {
            for (let i = 0; i < matchingPageNotFound.slugs.length && i < slugs.length; i++) {
                if (slugs[i][0] < matchingPageNotFound.slugs[i][0]) return;
                if (slugs[i][0] > matchingPageNotFound.slugs[i][0]) {
                    matchingPageNotFound = { path: route.path, slugs, depth, type: "notFound" };
                }
            }

            if (depth > matchingPageNotFound.depth) {
                matchingPageNotFound = { path: route.path, slugs, depth, type: "notFound" };
            } else if (slugs.length < matchingPageNotFound.slugs.length) {
                matchingPageNotFound = { path: route.path, slugs, depth, type: "notFound" };
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
        pathname: pathname,
        path: matchingRoute.path,
        type: matchingRoute.type,
        props: {
            searchParams: searchParamsToObj(searchParams),
            params: Object.fromEntries(
                matchingRoute.slugs.map(([depth, name]) => [name, decodeURIComponent(pathFragments[depth].slice(1))]),
            ),
        },
    };
}

export type PageStructure = { path: string; layout: boolean; loading: boolean; error: boolean }[];
function getRoutePageStructure({ path }: MatchingRoute, router: Route): PageStructure {
    const pageStructure: PageStructure = [];

    getPathnameFragments(path).reduce(
        ({ route, ...prev }, pathFragment, i, pathFragments) => {
            const path = i === 1 ? pathFragment : prev.path + pathFragment;
            pageStructure.push({
                path: path,
                layout: !!route.layout,
                loading: !!route.loading,
                error: !!route.error,
            });
            if (i + 1 === pathFragments.length) return { route, path };
            if (!route.routes) throw "This can't happen!";
            return { route: route.routes[pathFragments[i + 1]], path };
        },
        {
            path: "",
            route: router,
        },
    );

    return pageStructure;
}

function routeIsSlug(route: Route): route is SlugRouteFragment {
    return "name" in route;
}

function getPathnameFragments(pathname: string) {
    if (pathname === "/") return ["/"];
    return pathname.split("/").map((s) => `/${s}`);
}
