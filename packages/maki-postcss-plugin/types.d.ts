declare module "*.css" {
    const Style: string;
    export default Style;
}

declare module "maki-postcss-plugin" {
    import type { BunPlugin } from "bun";
    import type { AcceptedPlugin } from "postcss";

    export type MakiPostCssPluginOptions = { plugins: AcceptedPlugin[] };
    export default function makiPostCssPlugin(options: MakiPostCssPluginOptions): BunPlugin;
}
