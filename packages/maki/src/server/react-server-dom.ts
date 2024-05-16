import { join, resolve } from "node:path";
import { PassThrough, Readable } from "node:stream";
import PageNotFound from "@/PageNotFound";
import { createElement } from "@/utils";
import { type ReactNode, Suspense, lazy, use } from "react";
// import busboy from "busboy";
import { decodeReply, decodeReplyFromBusboy, renderToPipeableStream } from "react-server-dom-esm/server.node";
import type { MatchingRoute, ServerOptions } from "./server";

const moduleBaseURL = ".maki/";

export async function renderServerComponents(route: MatchingRoute, { cwd }: ServerOptions): Promise<PassThrough> {
    let currentPage: ReactNode;
    try {
        currentPage = await importComponent(join(cwd, ".maki/src/routes", route.pathname, "page.js"), route.props);

        for (const depth of route.pageStructure.toReversed()) {
            if (depth.loading) {
                currentPage = createElement(Suspense, {
                    fallback: await importComponent(
                        join(cwd, ".maki/src/routes", depth.pathname, "loading.js"),
                        route.props,
                    ),
                    children: currentPage,
                });
            }

            if (depth.layout) {
                currentPage = await importComponent(join(cwd, ".maki/src/routes", depth.pathname, "layout.js"), {
                    ...route.props,
                    children: currentPage,
                });
            }

            if (depth.error) {
                // currentPage = createElement(ErrorBoundary, {
                //     FallbackComponent: await importComponent(
                //         join(cwd, ".maki/src/routes", depth.pathname, "error.js"),
                //         route.props,
                //     ),
                //     children: currentPage,
                // });
            }
        }

        currentPage;
    } catch (e) {
        console.log("🚀 ~ renderServerComponents ~ mod:", currentPage, e);
        currentPage = PageNotFound();
    }

    return renderToPipeableStream(currentPage, moduleBaseURL).pipe(new PassThrough());
}

export async function handleServerAction(req: Request) {
    const actionReference = String(req.headers.get("rsa-reference"));
    const actionOrigin = String(req.headers.get("rsa-origin"));
    const url = new URL(req.url);
    // Resolve the action
    const [filepath, name] = actionReference.split("#");
    const action = (await import(`.${resolve(filepath)}`))[name];

    let args: unknown; // Decode the arguments
    if (req?.body && req.headers.get("content-type")?.startsWith("multipart/form-data")) {
        const rs = webToNodeStream(req.body);
        //@ts-ignore
        const bb = busboy({ headers: Object.fromEntries(req.headers.entries()) });
        const reply = decodeReplyFromBusboy(bb, `${resolve("build/")}/`);
        rs.pipe(bb);
        args = await reply;
    } else {
        args = await decodeReply(await req.text(), moduleBaseURL);
    }

    const returnValue = await action.apply(null, args); // Call the action

    const props = Object.fromEntries(url.searchParams.entries()); // We will use the query as props for the page
    const root = (await import(resolve("build/app", `.${actionOrigin}/page.js`))).default(props);
    return renderToPipeableStream({ returnValue, root }, moduleBaseURL); // Render the app with the RSC, action result and the new root
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

async function importComponent(path: string, props = {}) {
    const module = (await import(path)).default;

    if (typeof module === "function") {
        // The module is a server-component
        return createElement(({ component }) => use(component), { component: Promise.resolve(module(props)) });
    }

    // The module is a client-component
    return createElement(module, props);
}
