import Counter from "./Counter";
import Link from "./Link";

export default function App() {
    return (
        <>
            <div className="flex">
                <Link href="/nested">go deep</Link>
            </div>
            {Bun.which("bun")}

            <Counter />

            <p suppressHydrationWarning={true}>{new Date().toISOString()}</p>
            <p>HMR WORaaKS!</p>
        </>
    );
}
