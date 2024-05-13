import Link from "maki/routing";
import Counter from "./Counter";
// import Style from "./main.css";

export default function App() {
    return (
        <>
            <div className="flex">
                <Link href="/nested">go deep</Link>
            </div>
            {Bun.which("bun")}

            <Counter />

            <p suppressHydrationWarning={true}>{new Date().toISOString()}</p>
            <p className="font-bold p-2 ring-1">HMR WORaaKS!</p>

            {/* <Style /> */}
        </>
    );
}
