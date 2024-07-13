import { join, parse, resolve } from "node:path";
import { PassThrough, Readable } from "node:stream";
import { createElement } from "@/utils";
import type { BunPlugin } from "bun";
import { Fragment, type ReactNode, Suspense, use } from "react";
// import busboy from "busboy";
import { decodeReply, decodeReplyFromBusboy, renderToPipeableStream } from "react-server-dom-esm/server.node";
import type { MatchingRoute, PageStructure } from "../server/server";

let parseImport = false;
const stylesheets: string[] = [];

const moduleBasePath = "@maki-fs/";

export async function renderServerComponents(
    matchingRoute: MatchingRoute,
    pageStructure: PageStructure,
    { cwd }: { cwd: string },
): Promise<PassThrough> {
    stylesheets.length === 0;
    parseImport = true;

    const pageComponent = await importComponent(join(cwd, "src/routes", matchingRoute.path, matchingRoute.type));
    let currentPage: ReactNode = pageComponent(matchingRoute.props);

    for (const r of pageStructure.toReversed()) {
        if (r.loading) {
            const loadingComponent = await importComponent(join(cwd, "src/routes", r.path, "layout"));
            currentPage = createElement(Suspense, {
                fallback: loadingComponent(matchingRoute.props),
                children: currentPage,
            });
        }

        if (r.layout) {
            const layoutComponent = await importComponent(join(cwd, "src/routes", r.path, "layout"));
            const props = {
                ...matchingRoute.props,
                children: currentPage,
            };

            if (r.path === "/") {
                Object.assign(props, {
                    head: createElement(Fragment, {
                        children: stylesheets.map((href) =>
                            createElement("link", { rel: "stylesheet", href, key: href }),
                        ),
                    }),
                });
            }

            currentPage = layoutComponent(props);
        }

        if (r.error) {
            // currentPage = createElement(ErrorBoundary, {
            //     FallbackComponent: await importComponent(
            //         join(cwd, ".maki/src/routes", depth.pathname, "error.js"),
            //         route.props,
            //     ),
            //     children: currentPage,
            // });
        }
    }

    const MakiApp = await importComponent("../components/MakiApp");
    const App = createElement(MakiApp, {
        router: { initial: { pathname: matchingRoute.pathname } },
        children: currentPage,
    });

    const stream = renderToPipeableStream(App, moduleBasePath).pipe(new PassThrough());

    nukeImports();
    parseImport = false;
    return stream;
}

export async function handleServerAction(req: Request, { cwd }: { cwd: string }): Promise<PassThrough> {
    const actionReference = String(req.headers.get("rsa-reference"));
    const actionOrigin = String(req.headers.get("rsa-origin"));
    const url = new URL(req.url);
    // Resolve the action
    const [filepath, name] = actionReference.split("#");
    console.log("🚀 ~ handleServerAction ~ filepath:", filepath, name);
    const action = (await import(join(cwd, filepath)))[name];

    let args: unknown; // Decode the arguments
    if (req?.body && req.headers.get("content-type")?.startsWith("multipart/form-data")) {
        console.log("multipart");
        const rs = webToNodeStream(req.body);
        //@ts-ignore
        const bb = busboy({ headers: Object.fromEntries(req.headers.entries()) });
        const reply = decodeReplyFromBusboy(bb, `${resolve("build/")}/`);
        rs.pipe(bb);
        args = await reply;
    } else {
        console.log(".text()");
        const x = await req.text();
        console.log("🚀 ~ handleServerAction ~ x:", x);
        args = await decodeReply(x, moduleBasePath);
        console.log("DONES");
    }

    const returnValue = await action.apply(null, args); // Call the action

    const props = Object.fromEntries(url.searchParams.entries()); // We will use the query as props for the page
    const root = (await importComponent(join(cwd, ".maki/src/routes", url.pathname, "page.js")))(props);

    // Render the app with the RSC, action result and the new root
    return renderToPipeableStream({ returnValue, root }, moduleBasePath).pipe(new PassThrough());
}

function webToNodeStream(stream: ReadableStream): Readable {
    const reader = stream.getReader();
    return new Readable({
        async read() {
            const { done, value } = await reader.read();
            if (done) {
                this.push(null);
            } else {
                this.push(value);
            }
        },
    });
}

async function importComponent(path: string, importName = "default") {
    const module = (await import(path))[importName];

    if (typeof module === "function") {
        // The module is a server-component
        return (props: Record<string, unknown>) => {
            const component = module(props);
            if (component instanceof Promise) {
                return createElement(({ component }) => use(component), { component });
            }
            return component as ReactNode;
        };
    }

    // The module is a client-component
    return (props: Record<string, unknown>) => {
        return createElement(module, props);
    };
}

const imports: string[] = [];
const rscImportTransformerPlugin: BunPlugin = {
    name: "Maki RSC client import",
    async setup(build) {
        function exportToJsx(exportName: string, path: string, directive: ReactDirective) {
            const id = `@maki-fs/${path}#${exportName}`;
            const mod = `${exportName === "default" ? parse(path).name : ""}_${exportName}`;

            if (directive === "server") {
                // In case the of a server components, we add properties to a mock up function to avoid shipping the code to the client
                return `const ${mod}=()=>{throw new Error("This function is expected to only run on the server")};${mod}.$$typeof=Symbol.for("react.server.reference");${mod}.$$id="${id}";${mod}.$$bound=null; export {${mod} as ${exportName}};`;
            }

            return `const ${mod}={$$typeof:Symbol.for("react.client.reference"),$$id:"${id}",$$async:true}; export {${mod} as ${exportName}};`;
        }

        const transpiler = new Bun.Transpiler({ loader: "tsx" });

        build.onLoad({ filter: /\.[tj]sx$/ }, async (args) => {
            const file = await Bun.file(args.path).text();
            if (!parseImport) return { contents: file };

            const directive = file.match(/^[\s\n;]*(["`'])use (client|server)\1/);
            if (!directive) return { contents: file }; // If there are no directives, we let it be bundled

            const { exports } = transpiler.scan(file);
            if (exports.length === 0) return { contents: file }; // If there are no exports, we also let it be bundled

            imports.push(args.path);
            return {
                contents: exports.map((e) => exportToJsx(e, args.path, directive[2] as ReactDirective)).join("\n"),
            };
        });

        build.onLoad({ filter: /\.(?![cm]?[jt]sx?)[^.]*?$/ }, async (args) => {
            if (!parseImport) return;

            if (args.path.endsWith(".css")) {
                stylesheets.push(`/@maki-fs/${args.path}`);
            }

            return {
                exports: { default: `/@maki-fs/${args.path}` },
                loader: "object",
            };
        });
    },
};

type ReactDirective = "server" | "client";

Bun.plugin(rscImportTransformerPlugin);

function nukeImports() {
    for (const path of Object.keys(require.cache)) {
        if (!imports.includes(path)) continue;
        delete require.cache[path];
    }
}
