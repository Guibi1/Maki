"use client";
import { type ReactNode, createContext, use, useMemo, useState } from "react";

export interface MakiRouter {
    push(href: string): void;
    preload(href: string): void;
    get href(): string;
}

const RouterContext = createContext<MakiRouter | null>(null);
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined" && !window.maki.RouterContext)
    window.maki.RouterContext = RouterContext;

type RouterProps = { children: ReactNode; initial: { pathname: string } };
export default function Router({ children, initial }: RouterProps) {
    const [pathname, setPathname] = useState(initial.pathname);

    const appRouter = useMemo<MakiRouter>(
        () => ({
            push(href) {
                window.history.pushState({}, "", href);
                window.maki.render(href);
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
        // @ts-expect-error: React 19 api
        <RouterContext value={appRouter}>{children}</RouterContext>
    );
}

export function useRouter() {
    const router =
        process.env.NODE_ENV === "production"
            ? use(RouterContext)
            : typeof window === "undefined"
              ? use(RouterContext)
              : use(window.maki.RouterContext);

    if (!router) throw "Router not mounted...";
    return router;
}
