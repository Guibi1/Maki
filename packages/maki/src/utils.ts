import type { Stream } from "node:stream";
import type { MakiConfig } from "@/types";
import type { Attributes, FunctionComponent } from "react";
import { jsx } from "react/jsx-runtime";
import { colors } from "./log";

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

/**
 * Loads the maki config file of a project.
 * @param folder The path of the folder containing the config file
 * @returns The parsed maki config
 */
export async function loadMakiConfig(folder: string): Promise<MakiConfig> {
    try {
        const config = (await import(`${folder}/maki.config`)).default;
        // TODO: Validate the config schema
        return config;
    } catch {
        throw `Could not load the Maki config file at ${colors.link(folder)}.`;
    }
}

/**
 * Calculates the delta time between two `Bun.nanoseconds()` calls.
 * @param startTime The start time of the mesure
 * @param endTime The end time of the mesure
 * @returns The time that the mesured operation took, in milliseconds
 */
export function msDeltaTime(startTime: number, endTime?: number) {
    return Math.round(((endTime ?? Bun.nanoseconds()) - startTime) / 1_000_000);
}
