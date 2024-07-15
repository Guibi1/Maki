#!/usr/bin/env bun

import { resolve } from "node:path";
import { version } from "@/package.json";
import reactServerPlugin from "@/react-server/react-server-plugin";
import type { MakiConfig } from "@/types";
import { loadMakiConfig } from "@/utils";
import { Command, Option } from "commander";

Bun.plugin(reactServerPlugin);

const commander = new Command().name("maki").description("CLI to some JavaScript string utilities").version(version);

commander
    .command("dev")
    .description("Starts Maki in development mode.")
    .argument(
        "[directory]",
        "The directory that contains the Maki project. If no directory is provided, the current directory will be used.",
        ".",
    )
    .addOption(
        new Option("-p, --port <port>", "Specify a port number on which to start the application.")
            .argParser((s) => Number.parseInt(s))
            .default(3000)
            .env("PORT"),
    )
    .option("-H, --hostname <hostname>", "Specify a hostname on which to start the application (default: 0.0.0.0).")
    .action(async (directory: string, cliFlags: Record<string, unknown>) => {
        const { createServer } = await import("../server/server");

        const cwd = resolve(process.cwd(), directory);
        const config = await loadMakiConfig(cwd);

        createServer({ cwd, config, ...cliFlags });
    })
    .usage("[directory] [options]");

export type MakiDevCliOptions = {
    config: MakiConfig;
    cwd: string;
    port?: number;
};

commander
    .command("build")
    .description("Builds the current Maki project for production.")
    .argument(
        "[directory]",
        "The directory that contains the Maki project. If no directory is provided, the current directory will be used.",
        ".",
    )
    .option("-o, --outdir <dir>", "Specifies the output directory.", ".maki")
    .action(async (directory: string, cliFlags: Record<string, unknown>) => {
        const { buildProject } = await import("../server/build");

        const cwd = resolve(process.cwd(), directory);
        const config = await loadMakiConfig(cwd);

        await buildProject({ cwd, config, ...cliFlags });
    })
    .usage("[directory] [options]");

export type MakiBuildCliOptions = {
    config: MakiConfig;
    cwd: string;
    port?: number;
};

commander.parse();
