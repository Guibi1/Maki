import Router from "@/components/Router";
import { type ReactNode, StrictMode } from "react";

export type MakiAppProps = { children: ReactNode; router: { initial: { pathname: string } } };

export default function MakiApp({ children, router }: MakiAppProps) {
    return (
        <StrictMode>
            <Router {...router}>{children}</Router>
        </StrictMode>
    );
}
