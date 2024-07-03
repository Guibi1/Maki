/**
 * A Maki plugin that parses `.postcss` and `.css` files using PostCSS.
 */
declare module "maki-postcss-plugin" {
    import type { BunPlugin } from "bun";
    import type { AcceptedPlugin } from "postcss";

    export type MakiPostCssPluginOptions = { plugins: AcceptedPlugin[] };
    export default function makiPostCssPlugin(options: MakiPostCssPluginOptions): BunPlugin;
}

/**
 * Importing a stylesheet using Maki by itself does nothing. Make sure to link the stylesheet url in your React tree.
 */
declare module "*.css" {
    /**
     * The public absolute url at which Maki will host the processed stylesheet.
     */
    const styleSheet: string;
    export default styleSheet;
}
