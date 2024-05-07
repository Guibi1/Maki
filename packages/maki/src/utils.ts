import type { Stream } from "node:stream";
import type { Attributes, FunctionComponent } from "react";
import { jsx } from "react/jsx-runtime";

/**
 * Creates the JSX structure to render a React Component.
 * @param component The targeted React Component
 * @param props The props to pass on render
 * @returns The rendered component
 */
export function createElement<P extends {}>(component: FunctionComponent<P>, { key, ...props }: P & Attributes) {
    return jsx(component, props, key ?? undefined);
}

/**
 * Pipe a `NodeJS.Stream` to a web `ReadableStream`.
 * @param stream The node stream to pipe
 * @returns A normal web `ReadableStream`
 */
export function pipeToReadableStream(stream: Stream): ReadableStream {
    return new ReadableStream({
        start(controller) {
            stream.on("data", (chunk) => {
                controller.enqueue(chunk);
            });
            stream.on("end", () => {
                controller.close();
            });
            stream.on("error", (err) => {
                controller.error(err);
            });
        },
    });
}

declare module "react" {
    function use<T>(data: T): T extends Context<infer P> ? P : T;
}
