import Router from "@/routing/Router";
import { createElement } from "@/utils";
import type { ReactNode } from "react";
import ReactDomServer, { type RenderToReadableStreamOptions } from "react-dom/server";

export async function renderToReadableStream(Page: ReactNode, url: URL, options: RenderToReadableStreamOptions) {
    const page = createElement(Router, {
        initial: { pathname: url.pathname },
        children: Page,
    });

    return await ReactDomServer.renderToReadableStream(page, options);
}
