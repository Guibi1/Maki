import { type ReactNode, StrictMode } from "react";
import Router from "./Router";

export type MakiShellProps = { children: ReactNode; router: { initial: { pathname: string } } };

export default function MakiShell({ children, router }: MakiShellProps) {
    return (
        <StrictMode>
            <Router {...router}>{children}</Router>
        </StrictMode>
    );
}
