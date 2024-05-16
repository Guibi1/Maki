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
                window.history.pushState({}, "", href);
                window.maki.navigate(href);
                setPathname(href);
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
            </head>

            <body>
                {/* @ts-ignore: React 19 */}
                <RouterContext value={appRouter}>{children}</RouterContext>
            </body>
        </html>
    );
}

export function useRouter() {
    const router = use(RouterContext);
    if (!router) throw "Router not mounted...";
    return router;
}

// TODO: Handle slugs
type RouteProps = { url: string; children: ReactNode };
export function PageRoute({ url, children }: RouteProps) {
    const router = useRouter();
    return router.href === (url || "/") ? <Suspense fallback={"page loading..."}>{children}</Suspense> : null;
}

export function LayoutRoute({ url, children }: RouteProps) {
    const router = useRouter();
    return router.href.startsWith(url) ? <Suspense fallback={"layout loading..."}>{children}</Suspense> : null;
}
