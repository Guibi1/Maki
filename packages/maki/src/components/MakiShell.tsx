import Router from "@/components/Router";
import { type ReactNode, StrictMode } from "react";

export type MakiShellProps = { children: ReactNode; router: { initial: { pathname: string } } };

export default function MakiShell({ children, router }: MakiShellProps) {
    return (
        <StrictMode>
            <Router {...router}>{children}</Router>
        </StrictMode>
    );
}
