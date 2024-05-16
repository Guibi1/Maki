import Counter from "@/components/Counter";
import Link from "maki/routing";
import Maki from "./maki.svg";

export default function App() {
    return (
        <>
            <div className="flex">
                <Link href="/nested">go deep</Link>
            </div>

            {Bun.which("bun")}

            <Counter />

            <p suppressHydrationWarning={true}>{new Date().toISOString()}</p>
            {/* <p className="font-bold p-2 ring-1">HMR WORaaKS!</p> */}

            <img src={Maki} alt="maki" />
        </>
    );
}
