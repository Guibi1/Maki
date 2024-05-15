import autoprefixer from "autoprefixer";
import { plugin } from "bun";
import cssnano from "cssnano";
import type { MakiConfig } from "maki";
import makiTailwindPlugin from "maki-postcss-plugin";
import tailwind from "tailwindcss";
import tailwindNesting from "tailwindcss/nesting";

const config: MakiConfig = {
    plugins: [],
    // plugins: [makiTailwindPlugin({ plugins: [autoprefixer(), tailwindNesting(), tailwind(), cssnano()] })],
};

export default config;
