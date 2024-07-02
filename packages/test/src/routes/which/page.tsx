"use client";
import { which } from "./serverAction";

export default function WhichPage() {
    return (
        // @ts-expect-error: React 19 api
        <form action={which}>
            <label>
                Command name
                <input type="text" />
            </label>

            <button type="button" onClick={() => which("bun").then(console.log)}>
                Send
            </button>

            <button type="submit">Submit</button>
        </form>
    );
}
