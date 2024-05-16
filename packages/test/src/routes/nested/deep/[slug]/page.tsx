import Link from "maki/routing";

export default function Nested({ params, searchParams }) {
    return (
        <div>
            <Link href="/nested/deep">go back</Link>

            <p>ohh slug... pretty neat</p>
            {params.slug}
            {searchParams.zamn}
        </div>
    );
}
