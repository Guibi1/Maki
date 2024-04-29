import Link from "maki/routing"
import Test from "./Test";

export default function App() {
    return (
        <>
            <div>
                <Link href="/nested">go deep</Link>
            </div>

            <Test />

            <p suppressHydrationWarning={true}>{new Date().toISOString()}</p>
            <p>HMR WORKS!</p>
        </>
    );
}
