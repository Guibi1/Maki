import { join, resolve } from "node:path";
import { PassThrough, Readable } from "node:stream";
import { createElement } from "@/utils";
import { type ReactNode, Suspense, use } from "react";
// import busboy from "busboy";
import { decodeReply, decodeReplyFromBusboy, renderToPipeableStream } from "react-server-dom-esm/server.node";
import type { MatchingRoute, PageStructure, ServerOptions } from "./server";

const moduleBasePath = ".maki/";

export async function renderServerComponents(
    route: MatchingRoute,
    pageStructure: PageStructure,
    { cwd }: ServerOptions,
): Promise<PassThrough> {
    let currentPage: ReactNode = await importComponent(
        join(cwd, ".maki/src/routes", route.pathname, route.type),
        route.props,
    );

    for (const r of pageStructure.toReversed()) {
        if (r.loading) {
            currentPage = createElement(Suspense, {
                fallback: await importComponent(join(cwd, ".maki/src/routes", r.pathname, "loading.js"), route.props),
                children: currentPage,
            });
        }

        if (r.layout) {
            currentPage = await importComponent(join(cwd, ".maki/src/routes", r.pathname, "layout.js"), {
                ...route.props,
                children: currentPage,
            });
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

    return renderToPipeableStream(currentPage, moduleBasePath).pipe(new PassThrough());
}

export async function handleServerAction(req: Request, { cwd }: ServerOptions) {
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
    const root = await importComponent(join(cwd, ".maki/src/routes", url.pathname, "page.js"), props);

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

async function importComponent(path: string, props = {}, importName = "default") {
    const module = (await import(path))[importName];

    if (typeof module === "function") {
        // The module is a server-component
        return createElement(({ component }) => use(component), { component: Promise.resolve(module(props)) });
    }

    // The module is a client-component
    return createElement(module, props);
}
