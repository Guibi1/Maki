import type { ReactNode } from "react";
import Counter from "../components/Counter";
import "./main.css";
import Style from "./main.css";

export default function NestedLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <link rel="stylesheet" href={Style} />

            <h1 className="test">Root layout </h1>
            <Counter />

            {children}
        </>
    );
}
