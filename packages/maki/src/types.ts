import { type Type, type } from "arktype";
import type { ReactNode } from "react";

export const makiConfigValidator = type({
    plugins: (
        type({
            name: "string",
            filter: "RegExp|string",
            tranform: "Function",
        }) as Type<MakiPlugin>
    ).array(),
}) satisfies Type<MakiConfig>;

/**
 * The config of Maki.
 */
export type MakiConfig = {
    /**
     * The plugins to load and use.
     */
    plugins: MakiPlugin[];
};

/**
 * A Maki Plugin, used to transform any asset at compile-time.
 */
export type MakiPlugin = {
    /**
     * The name of the plugin.
     */
    name: string;

    /**
     * Which files the plugin should affect.
     * The full path of each assets will be matched against this filter.
     */
    filter: RegExp | string;

    /**
     * The transform function of the plugin.
     */
    tranform: (file: Blob, path: string) => Promise<Blob> | Blob;
};

/**
 * The props that Maki will pass to the root layout of the app.
 */
export type RootLayoutProps = { children: ReactNode; head: ReactNode };

/**
 * A utility type that takes an object type and makes the hover overlay more readable.
 * @see https://www.totaltypescript.com/concepts/the-prettify-helper
 */
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

declare module "react" {
    function use<T>(data: T): T extends Context<infer P> ? P : Awaited<T>;
}
