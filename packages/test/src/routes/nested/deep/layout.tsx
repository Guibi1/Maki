import type { ReactNode } from "react";

export default function NestedLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <h1>This is nested deep</h1>

            <p>children:</p>
            {children}
        </>
    );
}
