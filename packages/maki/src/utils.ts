import { format, parse } from "node:path";
import type { Stream } from "node:stream";
import { colors } from "@/log";
import { ArkErrors } from "arktype";
import type { Attributes, ElementType } from "react";
import { jsx } from "react/jsx-runtime";
import { type MakiConfig, makiConfigValidator } from "./types";

/**
 * Creates the JSX structure to render a React Component.
 * @param component The targeted React Component
 * @param props The props to pass on render
 * @returns The rendered component
 */
export function createElement<P extends {}>(component: ElementType<P>, { key, ...props }: P & Attributes) {
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
 * Removes the file extension of a path, if it has one.
 * @param path The path to parse
 * @returns The path without the file extension
 */
export function removeFileExtension(path: string) {
    const parsed = parse(path);
    return format({ ...parsed, base: parsed.name });
}

/**
 *
 * @returns
 */
export function getMakiBaseDir() {
    return import.meta.dir.slice(0, import.meta.dir.lastIndexOf("/"));
}

/**
 * Loads the maki config file of a project.
 * @param folder The path of the folder containing the config file
 * @returns The parsed maki config
 */
export async function loadMakiConfig(folder: string): Promise<MakiConfig> {
    try {
        const module = await import(`${folder}/maki.config`);
        const config = makiConfigValidator(module.default);

        if (config instanceof ArkErrors) {
            throw config.summary;
        }

        return module.default as MakiConfig;
    } catch (e) {
        throw `Could not load the Maki config file at ${colors.link(folder)}.\nReason: ${e}`;
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

/**
 * Parses and decodes an entire `URLSearchParam` to an object.
 * @param searchParams The `URLSearchParam` to parse
 * @returns An object containing the same values
 */
export function searchParamsToObj(searchParams: URLSearchParams) {
    return Object.fromEntries(
        Array.from(searchParams.keys()).map((k) => {
            const value = searchParams.getAll(k).map(decodeURIComponent);
            return [decodeURIComponent(k), value.length === 1 ? value[0] : value];
        }),
    );
}
