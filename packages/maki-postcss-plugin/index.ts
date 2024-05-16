import type { BunPlugin } from "bun";
import type { MakiPostCssPluginOptions } from "maki-postcss-plugin";
import postcss from "postcss";

export default function makiPostCssPlugin(options: MakiPostCssPluginOptions): BunPlugin {
    const processor = postcss(options.plugins);

    return {
        name: "Maki PostCSS",
        async setup(build) {
            build.onLoad({ filter: /\.(post)?css$/ }, async (args) => {
                console.log("🚀 ~ postcss.onLoad ~ args:", args);
                const css = await Bun.file(args.path).text();
                const result = await processor.process(css, { from: args.path });

                return {
                    contents: result.css,
                    loader: "text",
                };
            });
        },
    };
}
