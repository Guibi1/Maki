"use client";
import { type ReactNode, createContext, use, useEffect, useMemo, useState } from "react";

interface MakiRouter {
    push(pathname: string): void;
    preload(pathname: string): void;
    get pathname(): string;
}

const RouterContext = createContext<MakiRouter | null>(null);

type RouterProps = { children: ReactNode; initial: { pathname: string } };
export default function Router({ children, initial }: RouterProps) {
    const [pathname, setPathname] = useState(initial.pathname);

    const appRouter = useMemo<MakiRouter>(
        () => ({
            push(pathname) {
                window.history.pushState({}, "", pathname);
                window.maki.render(pathname);
                setPathname(pathname);
            },
            preload(pathname) {
                // preloadModule(href, { as: "script" });
            },
            get pathname() {
                return pathname;
            },
        }),
        [pathname],
    );

    useEffect(() => {
        const ac = new AbortController();

        window.addEventListener(
            "popstate",
            () => {
                const pathname = window.location.pathname;
                window.maki.render(pathname);
                setPathname(pathname);
            },
            ac,
        );

        return ac.abort;
    }, []);

    return (
        // @ts-expect-error: React 19 api
        <RouterContext value={appRouter}>{children}</RouterContext>
    );
}

export function useRouter() {
    const router = use(RouterContext);
    if (!router) throw "Router not mounted...";
    return router;
}
