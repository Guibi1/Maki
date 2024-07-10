import MakiShell from "@/components/MakiShell";
import type { MakiRouter } from "@/components/Router";
import { createElement } from "@/utils";
import type { Context, ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { createFromFetch } from "react-server-dom-esm/client.browser";

const root = hydrateRoot(document, fetchReactTree(location.pathname));
connectHMR();

window.maki.render = (pathname: string) => {
    root.render(fetchReactTree(pathname));
};

function connectHMR() {
    const ws = new WebSocket("/@maki/ws");
    ws.addEventListener("open", () => console.log("HMR client loaded"));

    ws.addEventListener("message", async ({ data }) => {
        const message = JSON.parse(data);
        console.log("🚀 ~ ws.addEventListener ~ data:", message);

        if (message.type === "change") {
            // if (window.location.pathname !== message.pathname) return;
            window.maki.render(location.pathname);
        }
    });

    const reconnect = () => {
        console.error("HMR client disconnected");
        setTimeout(connectHMR, 1000);
    };
    ws.addEventListener("close", reconnect);
    ws.addEventListener("error", reconnect);
}

async function callServerActions(id: string, args: unknown[]) {
    return (
        await createFromFetch(
            fetch("/@maki/actions", {
                method: "POST",
                // body: await encodeReply(args),
                headers: {
                    "rsa-origin": location.pathname, // Tells the server where the call is coming from
                    "rsa-reference": id, // Tells the server which action is being called
                },
            }),
            { callServer: callServerActions, moduleBaseURL: "/@maki-fs/" },
        )
    ).returnValue;
}

function fetchReactTree(pathname: string): ReactNode {
    const url = new URL(`/@maki/jsx${pathname}`, location.origin);
    url.search = location.search;

    const Page = createFromFetch(fetch(url), { callServer: callServerActions, moduleBaseURL: "/@maki-fs/" });
    return createElement(MakiShell, {
        router: { initial: { pathname } },
        children: Page,
    });
}

declare global {
    interface Window {
        maki: {
            render: (pathname: string) => void;
            RouterContext: Context<MakiRouter | null>;
        };
    }
}
