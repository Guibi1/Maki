#!/usr/bin/env bun

import { resolve } from "node:path";
import rscImportConditionPlugin from "@/rscImportConditionPlugin";
import { loadMakiConfig } from "@/utils";
import { Command, Option } from "commander";

Bun.plugin(rscImportConditionPlugin);

const commander = new Command().name("maki").description("CLI to some JavaScript string utilities").version("0.0.x");

commander
    .command("dev")
    .description("Starts Maki.js in development mode.")
    .argument(
        "[directory]",
        `A directory on which to build the application. ${"If no directory is provided, the current directory will be used."}`,
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

commander.parse();
