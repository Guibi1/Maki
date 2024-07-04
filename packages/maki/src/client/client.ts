import MakiShell from "@/components/MakiShell";
import { createElement } from "@/utils";
import { hydrateRoot } from "react-dom/client";
import { createFromFetch } from "react-server-dom-esm/client";

const moduleBaseURL = "/@maki/";

function fetchReactTree(pathname: string) {
    const url = new URL(`/@maki/jsx${pathname}`, location.origin);
    url.search = location.search;

    const Page = createFromFetch(fetch(url), { callServer, moduleBaseURL });
    return createElement(MakiShell, {
        router: { initial: { pathname } },
        children: Page,
    });
}

async function callServer(id: string, args: unknown[]) {
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
            { callServer, moduleBaseURL },
        )
    ).returnValue;
}

const root = hydrateRoot(document, fetchReactTree(location.pathname));

window.maki.render = (pathname: string) => {
    root.render(fetchReactTree(pathname));
};

const ws = new WebSocket(new URL("/@maki/ws", `ws://${window.location.host}`));
ws.addEventListener("message", async ({ data }) => {
    // root.render(createReactTree(`?t=${Date.now()}`));
    // const message = JSON.parse(data);
    // console.log("🚀 ~ ws.addEventListener ~ data:", message);
    // if (message.type === "change") {
    //     if (window.location.pathname !== message.pathname) return;
    //     // const module = await import(`${getModuleUrl(message.pathname)}/page.js?t=${Date.now()}`);
    //     root.render(await getReactTree(`?t=${Date.now()}`));
    // }
});

console.log("HMR client loaded", window.maki);

declare global {
    interface Window {
        maki: {
            render: (pathname: string) => void;
        };
    }
}
