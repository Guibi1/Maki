import { Fragment, lazy, type ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import Router, { LayoutRoute, PageRoute } from "../routing/Router";
import { jsx } from "../utils";

declare global {
    interface Window { maki: { routes: Route } }
}

type Route = {
    layout: boolean;
    page: boolean;
    routes?: Record<string, Route>;
};

function createReactTree() {
    const baseUrl = new URL("/@maki/routes", window.location.origin).toString();
    console.log("🚀 ~ createReactTree ~ baseUrl:", baseUrl)

    function routeToReact(route: Route, url: string): ReactNode {
        console.log("🚀 ~ routeToReact ~ url:", url)
        console.log("🚀 ~ routeToReact ~ route:", route)
        if (!route.page && !route.routes) return null;

        const subroutes = route.routes
            ? Object.entries(route.routes).map(([dir, subroute]) => routeToReact(subroute, url + dir))
            : null;
        const page = route.page ? jsx(PageRoute, { url: url }, jsx(lazy(() => import(`${baseUrl}${url}/page.js`)), { params: {} })) : null;

        if (!route.layout) return jsx(Fragment, { key: url }, page, subroutes);
        return jsx(LayoutRoute, { url, key: url }, jsx(lazy(() => import(`${baseUrl}${url}/layout.js`)), { params: {} }, page, subroutes));
    }

    return jsx(Router, { initial: { pathname: window.location.pathname }}, routeToReact(window.maki.routes, ""));
}


const root = hydrateRoot(document, createReactTree());

const ws = new WebSocket(new URL("/@maki/_ws", `ws://${window.location.host}`));
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
