import type { ReactNode } from "react";
import Counter from "./Counter";
import "./main.css";

export default function NestedLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <h1 className="test">Root layout </h1>
            <Counter />

            {children}
        </>
    );
}
