export type MakiConfig = {
    plugins: MakiPlugin[];
};

export type MakiPlugin = {
    name: string;
    filter: RegExp | string;
    modify: (file: Blob, path: string) => Promise<Blob> | Blob;
};

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

declare module "react" {
    function use<T>(data: T): T extends Context<infer P> ? P : Awaited<T>;
}
