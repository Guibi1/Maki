import { type Server } from "bun";
import { watch } from "node:fs";
import { format, parse } from "node:path";
import { Fragment, lazy, type ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import Router, { LayoutRoute, PageRoute } from "../routing/Router";
import { jsx } from "../utils";

// TODO: handle endpoints
// TODO: typesafe endpoints
// TODO: loading
// TODO: error boundaries
// TODO: good routing
// TODO: rsc

const routerGlob = new Bun.Glob("**/{page,layout,loading,error,notFound}.{tsx,jsx,ts,js}");
const endpointGlob = new Bun.Glob("**/{server.{ts,js}");
type ServerOptions = {
    cwd: string;
    port: number;
}

export async function createServer(options: ServerOptions) {
    console.clear();
    let build = await buildProject(options);
    let router = createRouter(options);

    const server: Server = Bun.serve({
        async fetch(req) {
            const url = new URL(req.url, server.url);
            const method = req.headers.get("METHOD") as Method ?? "GET";
            console.log("New request:", url.pathname)

            // * BUILD *
            if (method === "GET" && url.pathname.startsWith("/@maki/")) {
                const pathname = url.pathname.slice(6)
                if (pathname === "/_ws") {
                    if (server.upgrade(req)) return;
                    return new Response("WebSocket upgrade failed", { status: 400 });
                }

                if (pathname === "/_client") {
                    return new Response(build.client, { headers: { "Content-Type": "text/javascript" } });
                }

                const output = build.outputs[pathname];
                if (output) {
                    return new Response(output, { headers: { "Content-Type": "text/javascript" } });
                }

                return new Response("404", { status: 404 });
            }

            // * SERVER ENDPOINTS *
            const endpoint = "(url.pathname, method)"
            if (endpoint) {
                const output = ""
                return new Response(JSON.parse(output), { headers: { "Content-Type": "application/json" } });
            }

            if (method !== "GET") {
                return new Response("405 - Method not allowed", { status: 405 });
            }
    
            // * PUBLIC *
            const publicFile = Bun.file(options.cwd + "/public" + url.pathname);
            if (await publicFile.exists()) {
                return new Response(publicFile);
            }

            // * SERVER SIDE RENDER *
            try {
                const page = createReactTree(router, url.pathname);
                const stream = await renderToReadableStream(page, {
                    bootstrapModules: ["/@maki/_client"],
                    bootstrapScriptContent: `window.maki = ${JSON.stringify({ routes: routerToClient(router) ?? {} })};`,
                });

                return new Response(stream, { headers: { 'content-type': 'text/html' } });
            } catch (e) {
                console.error(e);
                throw "Render error: invalid React component";
            }
        },
        websocket: {
            open(ws) {
                ws.subscribe("hmr");
                console.log("WebSocket: HMR client connected");
            },
            close(ws, code, message) {
                console.log("WebSocket: HMR client disconnected");
            },
            message(ws, message) {
                // ws.sendText("test", true);
            },
        },
        port: options.port,
    });

    
    const watcher = watch(options.cwd + "/src/routes", { recursive: true });
    watcher.addListener("change", async (_, file: string) => {
        console.log(file, "modified, reloading...");
        build = await buildProject(options);
        router = createRouter(options);
        
        server.publish("hmr", JSON.stringify({ type: "change", pathname: `/${parse(file).dir}` }), true);
    });
    
    console.log("Server running on port", server.port, "\n");
    return server;
}

async function buildProject({ cwd }: ServerOptions) {
    console.time("Compilation done!");
    const result = await Bun.build({
        entrypoints: Array.from(routerGlob.scanSync({ cwd: cwd + "/src/routes" })).map(s => cwd + "/src/routes/" + s).concat(import.meta.dir + "/../client/client.ts"),
        publicPath: "./",
        root: cwd + "/src",
        target: "browser",
        sourcemap: "inline",
        splitting: true,
        minify: true,
        naming: {
            entry: './@maki/[dir]/[name].[ext]',
            chunk: './@maki/chunks/[hash].[ext]',
            asset: './@maki/assets/[name]-[hash].[ext]',
        }
    });

    if (!result.success) {
        throw new AggregateError(result.logs, "Build failed");
    }

    const client = result.outputs.find((o) => o.path.endsWith("maki/src/client/client.js"));
    if (!client) {
        throw "Build error: Couldnt find the client entry-point."
    }
    const clientScript = (await client.text()).replace(/"(?:[.a-z0-9]+\/)+?(@maki\/chunks\/[a-z0-9]+\.js)"/g, "\"/$1\"")

    console.timeEnd("Compilation done!");
    return {
        client: clientScript,
        outputs: Object.fromEntries(result.outputs.map(b => ([b.path.slice(7), b]))),
    };
}

function createRouter({ cwd }: ServerOptions) {
    const files = Array.from(routerGlob.scanSync({ cwd: cwd + "/src/routes"})).map(parse);
    const router: RouteFragment = { pathname: "/" };

    for (const path of files) {
        const dir = path.dir.split("/").map((p) => `/${p}`);

        const parentRoute: Route = dir.reduce((parent, path, i) => {
            if (path === "/") return parent
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

        if (path.name === "page" || path.name === "layout" || path.name === "loading" || path.name === "error" || path.name === "notFound") {
            const sourcefilePath = format({ ...path, base: path.name });
            parentRoute[path.name] = lazy(() => import(`${cwd}/src/routes/${sourcefilePath}`));
        }
    }

    return router;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

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
}
function routerToClient(route: Route): ClientRoutes | null {
    if (!route.page && !route.routes) return null;

    const r:ClientRoutes = {
        page: !!route.page,
        layout: !!route.layout,
    };
    
    if (route.routes) {
        for (const [url, subroute] of Object.entries(route.routes)) {
            const clientSubroute = routerToClient(subroute);
            if (!clientSubroute) continue
            if (!r.routes) r.routes = {}
            r.routes[url] = clientSubroute
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
        const page = route.page ? jsx(PageRoute, { url }, jsx(route.page, { params: {} })) : null;

        if (!route.layout) return jsx(Fragment, { key: url }, page, subroutes);
        return jsx(LayoutRoute, { url, key: url }, jsx(route.layout, { params: {} }, page, subroutes));
    }

    return jsx(Router, { initial: { pathname } }, routeToReact(router, ""));
}

function routeIsSlug(route: Route): route is SlugRouteFragment {
    return "name" in route;
}
