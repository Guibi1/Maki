import { useState } from "react";

export default function App() {
    const [state, set] = useState(2);

    return (
        <div>
            <p>{state}</p>

            <button type="button" onClick={() => set((p) => p + 1)}>
                TESaT
            </button>
        </div>
    );
}
