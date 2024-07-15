import { api } from "maki";
import Link from "maki/routing";

export default async function Nested() {
    const a = await api("/api/[id]", "PUT", { searchParams: { value: "23" }, params: { id: "2" } });
    if (a.ok) console.log(a.data);

    return (
        <div>
            <Link href="/">go back</Link>
            <Link href="/nested/deep">go all in</Link>

            <p>testssss!!!!</p>
        </div>
    );
}
