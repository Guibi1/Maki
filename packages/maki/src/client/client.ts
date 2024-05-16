import Router, { LayoutRoute, PageRoute } from "@/routing/Router";
import { createElement } from "@/utils";
import { Fragment, type ReactNode, lazy } from "react";
import { hydrateRoot } from "react-dom/client";
import { createFromFetch } from "react-server-dom-esm/client";

declare global {
    interface Window {
        maki: { routes: Route; navigate: (pathname: string) => void };
    }
}

type Route = {
    layout: boolean;
    page: boolean;
    routes?: Record<string, Route>;
};

const moduleBaseURL = "/@maki/";

function createReactTree() {
    const baseUrl = new URL("/@maki/routes", window.location.origin).toString();
    console.log("🚀 ~ createReactTree ~ baseUrl:", baseUrl);

    function routeToReact(route: Route, url: string): ReactNode {
        console.log("🚀 ~ routeToReact ~ url:", url);
        console.log("🚀 ~ routeToReact ~ route:", route);
        if (!route.page && !route.routes) return null;

        const subroutes = route.routes
            ? Object.entries(route.routes).map(([dir, subroute]) => routeToReact(subroute, url + dir))
            : null;
        const page = route.page
            ? createElement(PageRoute, {
                  url: url,
                  children: createElement(
                      lazy(() => import(`${baseUrl}${url}/page.js`)),
                      { params: {} },
                  ),
              })
            : null;

        if (!route.layout) return createElement(Fragment, { key: url, children: [page, subroutes] });
        return createElement(LayoutRoute, {
            url,
            key: url,
            children: createElement(
                lazy(() => import(`${baseUrl}${url}/layout.js`)),
                { params: {}, children: [page, subroutes] },
            ),
        });
    }

    return createElement(Router, {
        initial: { pathname: window.location.pathname },
        children: routeToReact(window.maki.routes, ""),
    });
}

function createTree(pathname: string) {
    const page = createFromFetch(fetch(`/@maki/jsx${pathname}`), { callServer, moduleBaseURL });
    console.log("🚀 ~ createTree ~ page:", page);
    return createElement(Router, {
        initial: { pathname },
        children: page,
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

const root = hydrateRoot(document, createTree(location.pathname));

window.maki.navigate = (pathname: string) => {
    root.render(createTree(pathname));
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
