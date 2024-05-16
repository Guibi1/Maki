import Link from "maki/routing";
// import { useState } from "react";
import randomImage from "../../image.png";

export default async function Nested() {
    await Bun.sleep(4000);
    // const [state, set] = useState(0);
    return (
        <div>
            <Link href="/nested">go back</Link>
            <Link href="/nested/deep/wow">again deeper</Link>

            <p>DEEP!!!!</p>

            {/* <p onMouseEnter={() => set((s) => s + 1)}>Hover: {state}</p> */}

            <img src={randomImage} />
        </div>
    );
}
