import { join, resolve } from "node:path";
import { PassThrough, Readable } from "node:stream";
import PageNotFound from "@/PageNotFound";
import type { ReactNode } from "react";
// import busboy from "busboy";
import { decodeReply, decodeReplyFromBusboy, renderToPipeableStream } from "react-server-dom-esm/server.node";
import type { ServerOptions } from "./server";

const moduleBaseURL = ".maki/";

export async function renderServerComponents(pathname: string, { cwd }: ServerOptions): Promise<PassThrough> {
    let mod: ReactNode;
    try {
        mod = (await import(join(cwd, ".maki/server/routes", pathname, "page.js"))).default();
    } catch {
        mod = PageNotFound();
    }

    return renderToPipeableStream(mod, moduleBaseURL).pipe(new PassThrough());
}

export async function handleServerAction(req: Request) {
    const actionReference = String(req.headers.get("rsa-reference"));
    const actionOrigin = String(req.headers.get("rsa-origin"));
    const url = new URL(req.url);
    // Resolve the action
    const [filepath, name] = actionReference.split("#");
    const action = (await import(`.${resolve(filepath)}`))[name];

    let args; // Decode the arguments
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
