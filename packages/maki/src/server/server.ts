import { watch } from "node:fs";
import { format, parse, relative } from "node:path";
import { Readable, Writable } from "node:stream";
import Router, { LayoutRoute, PageRoute } from "@/routing/Router";
import type { MakiConfig } from "@/types";
import { createElement, pipeToReadableStream } from "@/utils";
import type { Server } from "bun";
import { Fragment, type ReactNode, lazy } from "react";
import { renderToReadableStream } from "react-dom/server";
import { createFromNodeStream } from "react-server-dom-esm/client.node";
import { handleServerAction, renderServerComponents } from "./react-server-dom";

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
};

export async function createServer(options: ServerOptions) {
    // console.clear();
    let build = await buildProject(options);
    let router = createRouter(options);

    const server: Server = Bun.serve({
        async fetch(req) {
            const url = new URL(req.url, server.url);
            const method = (req.headers.get("METHOD")?.toUpperCase() as Method) ?? "GET";
            console.log("New request:", url.pathname);

            // * SERVER COMPONENTS *
            if (method === "GET" && url.pathname.startsWith("/@maki/jsx/")) {
                const pathname = url.pathname.slice(10);
                const stream = await renderServerComponents(req);
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
                const App = createFromNodeStream(await renderServerComponents(req), "/@maki", "/@maki");

                const page: ReactNode = createElement(Router, { initial: { pathname: url.pathname }, children: App });
                // // const page = createReactTree(router, url.pathname);

                // @ts-ignore
                const stream = await renderToReadableStream(page, {
                    bootstrapModules: ["/@maki/_client"],
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

    const watcher = watch(`${options.cwd}/src/routes`, { recursive: true });
    watcher.addListener("change", async (_, file: string) => {
        console.log(file, "modified, reloading...");
        build = await buildProject(options);
        router = createRouter(options);

        server.publish("hmr", JSON.stringify({ type: "change", pathname: `/${parse(file).dir}` }), true);
    });

    console.log("Server running on port", server.port, "\n");
    return server;
}

type ReactDirective = "server" | "client";
async function buildProject({ cwd }: ServerOptions) {
    const config = (await import(`${cwd}/maki.config`)).default as MakiConfig;

    console.time("Compilation done!");
    const result = await Bun.build({
        entrypoints: Array.from(routerGlob.scanSync({ cwd: `${cwd}/src/routes` }))
            .map((s) => `${cwd}/src/routes/${s}`)
            .concat(`${import.meta.dir}/../client/client.ts`),
        publicPath: "./",
        root: `${cwd}/src`,
        target: "browser",
        sourcemap: "inline",
        splitting: true,
        minify: true,
        naming: {
            entry: "./@maki/[dir]/[name].[ext]",
            chunk: "./@maki/chunks/[hash].[ext]",
            asset: "./@maki/assets/[name]-[hash].[ext]",
        },
        plugins: [
            {
                name: "Maki React Register",
                setup(build) {
                    function exportToJsx(exportName: string, path: string, directive: ReactDirective) {
                        const id = `/${relative(cwd, path)
                            .replace("src", "build")
                            .replace(/\..+$/, ".js")}#${exportName}`; // React uses this to identify the component
                        const mod = `${exportName === "default" ? parse(path).name : ""}_${exportName}`; // We create a unique name for the component export

                        if (directive === "server") {
                            // In case the of a server components, we add properties to a mock up function to avoid shipping the code to the client
                            return `const ${mod}=()=>{throw new Error("This function is expected to only run on the server")};${mod}.$$typeof=Symbol.for("react.server.reference");${mod}.$$id="${id}";${mod}.$$bound=null; export {${mod} as ${exportName}};`;
                        }

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
            ...config.plugins,
        ],
    });

    if (!result.success) {
        console.error("Bun build failed");
        throw new AggregateError(result.logs, "Build failed");
    }

    const client = result.outputs.find((o) => o.path.endsWith("maki/src/client/client.js"));
    if (!client) {
        throw "Build error: Couldnt find the client entry-point.";
    }
    const clientScript = (await client.text()).replace(/"(?:[.a-z0-9]+\/)+?(@maki\/chunks\/[a-z0-9]+\.js)"/g, '"/$1"');

    console.timeEnd("Compilation done!");
    return {
        client: clientScript,
        outputs: Object.fromEntries(result.outputs.map((b) => [b.path.slice(7), b])),
    };
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

function routeIsSlug(route: Route): route is SlugRouteFragment {
    return "name" in route;
}
