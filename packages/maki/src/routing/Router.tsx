"use client";
import { type ReactNode, Suspense, createContext, use, useMemo, useState } from "react";

interface AppRouter {
    push(href: string): void;
    preload(href: string): void;
    get href(): string;
}

const RouterContext = createContext<AppRouter | null>(null);

type RouterProps = { children: ReactNode; initial: { pathname: string } };
export default function Router({ children, initial }: RouterProps) {
    const [pathname, setPathname] = useState(initial.pathname);

    const appRouter = useMemo<AppRouter>(
        () => ({
            push(href) {
                setPathname(href);
                window.history.pushState({}, "", href);
            },
            preload(href) {
                // preloadModule(href, { as: "script" });
            },
            get href(): string {
                return pathname;
            },
        }),
        [pathname],
    );

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                {/* <link rel="stylesheet" href="/styles.css"></link> */}
                <title>My app</title>
            </head>

            <body>
                <RouterContext value={appRouter}>{children}</RouterContext>
            </body>
        </html>
    );
}

const useRouter = () => {
    const router = use(RouterContext);
    if (!router) throw "Router not mounted...";
    return router;
};

// TODO: Handle slugs
type RouteProps = { url: string; children: ReactNode };
const PageRoute = ({ url, children }: RouteProps) => {
    const router = useRouter();
    return router.href === (url || "/") ? <Suspense fallback={"page loading..."}>{children}</Suspense> : null;
};

const LayoutRoute = ({ url, children }: RouteProps) => {
    const router = useRouter();
    return router.href.startsWith(url) ? <Suspense fallback={"layout loading..."}>{children}</Suspense> : null;
};

export { LayoutRoute, PageRoute, Router, useRouter };
