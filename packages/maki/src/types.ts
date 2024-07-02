export type MakiConfig = {
    plugins: MakiPlugin[];
};

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
    modify: (file: Blob, path: string) => Promise<Blob> | Blob;
};

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
