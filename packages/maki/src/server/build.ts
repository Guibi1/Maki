import { existsSync, rmdirSync } from "node:fs";
import { basename, join, parse, relative, resolve } from "node:path";
import type { MakiBuildCliOptions } from "@/bin/maki";
import log from "@/log";
import { getMakiBaseDir, removeFileExtension } from "@/utils";

type ReactDirective = "server" | "client";
const sourceFileGlob = new Bun.Glob("**/*.{tsx,jsx,ts,js}");
export async function buildProject({ cwd, config }: MakiBuildCliOptions) {
    log.maki();

    const startTime = Bun.nanoseconds();
    const outdir = join(cwd, ".maki");
    const clientComponents = new Set<string>();

    if (existsSync(outdir)) {
        rmdirSync(outdir, { recursive: true });
    }

    // * Server components * //
    const serverBuild = await Bun.build({
        entrypoints: Array.from(sourceFileGlob.scanSync({ cwd: `${cwd}/src` })).map((s) => `${cwd}/src/${s}`),
        root: `${cwd}/src`,
        sourcemap: "none",
        minify: true, // Disabling minifying triggers a bundling error

        outdir: outdir,
        target: "browser",
        splitting: true,
        naming: {
            entry: "./src/[dir]/[name].[ext]",
            chunk: "./chunks/[hash].[ext]",
        },

        plugins: [
            {
                name: "Maki React Register",
                setup(build) {
                    function exportToJsx(exportName: string, path: string, directive: ReactDirective) {
                        const isInternalMakiFile = path.startsWith(getMakiBaseDir());

                        const exportPath = isInternalMakiFile
                            ? relative(getMakiBaseDir(), path).replace("src/components", ".maki/_internal")
                            : relative(cwd, path).replace("src", ".maki/src");
                        const id = `${removeFileExtension(exportPath)}.js#${exportName}`;
                        const mod = `${exportName === "default" ? parse(path).name : ""}_${exportName}`;
                        if (directive === "server") {
                            // In case the of a server components, we add properties to a mock up function to avoid shipping the code to the client
                            return `const ${mod}=()=>{throw new Error("This function is expected to only run on the server")};${mod}.$$typeof=Symbol.for("react.server.reference");${mod}.$$id="${id}";${mod}.$$bound=null; export {${mod} as ${exportName}};`;
                        }

                        clientComponents.add(path);
                        return `const ${mod}={$$typeof:Symbol.for("react.client.reference"),$$id:"${id}",$$async:true}; export {${mod} as ${exportName}};`;
                    }

                    const transpiler = new Bun.Transpiler({ loader: "tsx" });

                    build.onLoad({ filter: /\.[tj]sx?$/ }, async (args) => {
                        const file = await Bun.file(args.path).text();

                        const directive = file.match(/^[\s\n;]*(["`'])use (client)\1/);
                        if (!directive) return { contents: file }; // If there are no directives, we let it be bundled

                        const { exports } = transpiler.scan(file);
                        if (exports.length === 0) return { contents: file }; // If there are no exports, we also let it be bundled

                        return {
                            contents: exports
                                .map((e) => exportToJsx(e, args.path, directive[2] as ReactDirective))
                                .join("\n"),
                        };
                    });
                },
            },
            {
                name: "Maki Asset Handler",
                setup(build) {
                    build.onLoad({ filter: /.+/ }, async (args) => {
                        if (args.namespace !== "file" || !["css", "js", "file"].includes(args.loader)) return;

                        const { name, ext } = parse(args.path);

                        const asset = await config.plugins
                            .filter((plugin) => args.path.match(plugin.filter))
                            .reduce<Promise<Blob>>(
                                (blob, plugin) => blob.then((blob) => plugin.tranform(blob, args.path)),
                                Promise.resolve(Bun.file(args.path)),
                            );

                        const hash = Bun.hash.cityHash32(await asset.arrayBuffer());
                        const url = `/@maki/assets/${name}-${hash}${ext}`;
                        await Bun.write(join(outdir, `/assets/${name}-${hash}${ext}`), asset);

                        return {
                            contents: url,
                            loader: "text",
                        };
                    });
                },
            },
        ],
    });

    if (!serverBuild.success) {
        console.error("Server build failed");
        throw new AggregateError(serverBuild.logs, "Server build failed");
    }

    // * Client components * //
    const clientBuild = await Bun.build({
        entrypoints: Array.from(clientComponents).concat(
            `${getMakiBaseDir()}/src/components/MakiApp.tsx`,
            `${getMakiBaseDir()}/src/client/client.ts`,
        ),
        root: `${cwd}/src`,
        sourcemap: "none",
        minify: true, // Disabling minifying triggers a bundling error

        target: "browser",
        splitting: true,
        naming: {
            entry: "./@maki/src/[dir]/[name].[ext]",
            chunk: "./@maki/chunks/[hash].[ext]",
        },

        publicPath: "./",
        plugins: [
            {
                name: "Maki React Register",
                setup(build) {
                    function exportToJsx(exportName: string, path: string) {
                        const isInternalMakiFile = path.startsWith(getMakiBaseDir());

                        const exportPath = isInternalMakiFile
                            ? relative(getMakiBaseDir(), path).replace("src/components", ".maki/_internal")
                            : relative(cwd, path).replace("src", ".maki/src");
                        const id = `${removeFileExtension(exportPath)}.js#${exportName}`;
                        const mod = `${exportName === "default" ? parse(path).name : ""}_${exportName}`;

                        // In case the of a server components, we add properties to a mock up function to avoid shipping the code to the client
                        return `const ${mod}={};${mod}.$$typeof=Symbol.for("react.server.reference");${mod}.$$id="${id}";${mod}.$$bound=null; export {${mod} as ${exportName}};`;
                    }

                    const transpiler = new Bun.Transpiler({ loader: "tsx" });

                    build.onLoad({ filter: /\.[tj]sx?$/ }, async (args) => {
                        const file = await Bun.file(args.path).text();

                        const directive = file.match(/^[\s\n;]*(["`'])use server\1/);
                        if (!directive) return { contents: file }; // If there are no directives, we let it be bundled

                        const { exports } = transpiler.scan(file);
                        if (exports.length === 0) return { contents: file }; // If there are no exports, we also let it be bundled

                        return {
                            contents: exports.map((e) => exportToJsx(e, args.path)).join("\n"),
                        };
                    });
                },
            },
            {
                name: "Maki Asset Handler",
                setup(build) {
                    build.onLoad({ filter: /.+/ }, async (args) => {
                        if (args.namespace !== "file" || !["css", "js", "file"].includes(args.loader)) return;

                        const { name, ext } = parse(args.path);
                        const hash = Bun.hash.cityHash32(args.path);
                        await Bun.write(join(outdir, `/assets/${name}-${hash}${ext}`), Bun.file(args.path));

                        return {
                            contents: `/@maki/assets/${name}-${hash}${ext}`,
                            loader: "text",
                        };
                    });
                },
            },
        ],
    });

    if (!clientBuild.success) {
        console.error("Client build failed");
        throw new AggregateError(clientBuild.logs, "Client build failed");
    }

    const clientOutput = clientBuild.outputs.find((o) => o.path.endsWith("/maki/src/client/client.js"));
    if (!clientOutput) {
        throw "Build error: Couldnt find the client entry-point.";
    }

    await Bun.write(
        join(outdir, "client.js"),
        (await clientOutput.text())
            .replace(/"(?:\.{1,2}\/)+(?:[a-zA-Z0-9]+\/)+([a-zA-Z0-9]+\.js)"/g, '"/@maki/_internal/$1"')
            .replace(/"(?:[.a-zA-Z0-9]+\/)+?(@maki\/chunks\/[a-z0-9]+\.js)"/g, '"/$1"'),
    );

    for (const output of clientBuild.outputs) {
        if (output === clientOutput) continue;
        const path = output.path.slice(7);

        const compiledFilePath = resolve(`${cwd}`, `.${path}`);
        if (compiledFilePath.startsWith(`${getMakiBaseDir()}/`)) {
            // Is internal maki source file

            const source = (await output.text()).replace(
                /"(?:[.a-z0-9]+\/)+?@maki\/(chunks\/[a-z0-9]+\.js)"/g,
                '"../$1"',
            );

            await Bun.write(join(outdir, `client/_internal/${basename(path)}`), source);
            continue;
        }

        const source = (await output.text()).replace(
            /"(?:\.{1,2}\/)+maki\/src\/[a-zA-Z0-9]+\/([a-zA-Z0-9]+\.js)"/g,
            '"./../_internal/$1"',
        );

        await Bun.write(join(outdir, "client", path), source);
    }

    log.buildComplete(startTime, "Compilation done");
}
