#!/usr/bin/env bun

import { resolve } from "node:path";
import { Command, Option } from 'commander';
const program = new Command();

program
  .name('maki')
  .description('CLI to some JavaScript string utilities')
  .version('0.0.x');

program
    .command('dev')
    .description(
        'Starts Maki.js in development mode.'
    )
    .argument(
        '[directory]',
        `A directory on which to build the application. ${(
        'If no directory is provided, the current directory will be used.'
        )}`,
        "."
    )
    .addOption(
        new Option(
        '-p, --port <port>',
        'Specify a port number on which to start the application.'
        )
        .argParser((s) => Number.parseInt(s))
        .default(3000)
        .env('PORT')
    )
    .option(
        '-H, --hostname <hostname>',
        'Specify a hostname on which to start the application (default: 0.0.0.0).'
    )
    .action(async (directory: string, options) => {
        const { createServer} = await import("../server/server");
        createServer({ cwd: resolve(process.cwd(), directory), ...options });
    })
  .usage('[directory] [options]')

program.parse();
