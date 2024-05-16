import type { MakiPlugin } from "maki";
import postcss, { type AcceptedPlugin } from "postcss";

export type MakiPostCssPluginOptions = { plugins: AcceptedPlugin[] };

export default function makiPostCssPlugin(options: MakiPostCssPluginOptions): MakiPlugin {
    const processor = postcss(options.plugins);

    return {
        name: "Maki PostCSS",
        filter: /\.(post)?css$/,
        async modify(blob, path) {
            const css = await blob.text();
            const result = await processor.process(css, { from: path });

            return new Blob([result.css], { type: "text/css" });
        },
    };
}
