"use client";
import Link from "maki/routing";
import randomImage from "../../image.png";

export default function Nested() {
    return (
        <div>
            <Link href="/nested">go back</Link>

            <p>DEEP!!!!</p>

            <img src={randomImage} />
        </div>
    );
}
