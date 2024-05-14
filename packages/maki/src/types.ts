import type { BunPlugin } from "bun";

export type MakiConfig = {
    plugins: BunPlugin[];
};

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

declare module "react" {
    function use<T>(data: T): T extends Context<infer P> ? P : T;
}
