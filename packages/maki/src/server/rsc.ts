import { Readable, Writable } from "node:stream";
import type { PipeableStream } from "react-dom/server";
import * as ReactServerDom from "react-server-dom-esm/server.node";

if (!process.send) process.exit(1);
const send = process.send;

function log(...data: unknown[]) {
    send({ type: "log", data: data.join(" ") });
}

process.on("message", async (message, sendHandle) => {
    log("Received message", message);
    const { pipe }: PipeableStream = ReactServerDom.renderToPipeableStream(
        await import("/home/guibi/Git/maki/packages/test/src/routes/nested/page").then((mod) => mod.default()),
    );

    const stream = new Writable({
        write(chunk, encoding, callback) {
            send({ type: "rsc", data: chunk, encoding });
            callback();
        },
    });
    pipe(stream);
});

log("RSC server started!");
