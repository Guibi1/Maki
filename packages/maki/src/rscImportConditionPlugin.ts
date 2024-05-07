import type { BunPlugin } from "bun";

/**
 * This plugin compiles `/react-server-dom.ts` with the "--condition react-server" flag on import, which allows a single Bun process to import `default` and `react-server` at the same time.
 * Credit: https://github.com/rafaelrcamargo/r19/issues/4
 */
const rscImportConditionPlugin: BunPlugin = {
    name: "Maki RSC import condition",
    async setup(build) {
        build.onLoad({ filter: /\/react-server-dom\.ts$/ }, async ({ path }) => {
            const output = await Bun.build({
                entrypoints: [path],
                target: "bun",
                conditions: "react-server", // The magic happens here!
                external: ["node:*"],
            });

            return {
                contents: await output.outputs[0].text(),
                loader: "js",
            };
        });
    },
};

export default rscImportConditionPlugin;
