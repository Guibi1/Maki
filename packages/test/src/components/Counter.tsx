"use client";
import { useState } from "react";

export default function Counter() {
    const [state, set] = useState(0);

    return (
        <button
            className="px-4 py-2 m-2 rounded border-zinc-600 bg-zinc-800 text-white"
            type="button"
            onClick={() => set((p) => p + 1)}
        >
            You clicked {state} times :o
        </button>
    );
}
