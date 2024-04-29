import type { BunPlugin } from "bun";
import postcss, { type AcceptedPlugin } from "postcss";

export type MakiPostCssPluginOptions = { plugins: AcceptedPlugin[] };

const makiPostCssPlugin = (options: MakiPostCssPluginOptions): BunPlugin => {
    return {
        name: "Maki PostCSS",
        setup(build) {
            build.onLoad({ filter: /\.css$/ }, async (args) => {
                const css = await Bun.file(args.path).text();

                const processor = postcss(options.plugins);
                console.log("🚀 ~ build.onLoad ~ processor:", processor);
                const result = await processor.process(css, { from: args.path });
                // const outfile = template.replace("{{ STYLES }}", result.css);

                console.log("🚀 ~ build.onLoad ~ result.css:", result.css);
                return {
                    contents: result.css,
                    loader: "text",
                };
            });
        },
    };
};

export default makiPostCssPlugin;
