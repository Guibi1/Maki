import tailwind from "@tailwindcss/postcss";
import type { MakiConfig } from "maki";
import makiPostCssPlugin from "maki-postcss-plugin";

const config: MakiConfig = {
    plugins: [makiPostCssPlugin({ plugins: [tailwind()] })],
};

export default config;
