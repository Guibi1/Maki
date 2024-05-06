import Link from "maki/routing";
import Counter from "./Counter";

export default function App() {
    return (
        <>
            <div className="flex">
                <Link href="/nested">go deep</Link>
            </div>

            <Counter />

            <p suppressHydrationWarning={true}>{new Date().toISOString()}</p>
            <p>HMR WORaaKS!</p>
        </>
    );
}
