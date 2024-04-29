import type { ReactNode } from "react";
import Test from "./Test";

export default function NestedLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <h1>Root layout </h1>
            <Test />

            {children}
        </>
    );
}
