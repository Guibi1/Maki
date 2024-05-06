"use client";
import { useState } from "react";

export default function Counter() {
    const [state, set] = useState(2);

    return (
        <button type="button" onClick={() => set((p) => p + 1)}>
            Count! {state}
        </button>
    );
}
