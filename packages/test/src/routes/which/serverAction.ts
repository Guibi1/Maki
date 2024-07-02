"use server";

export async function which(command: string) {
    console.log("Running `Bun.which` on the server.", command);

    return Bun.which(command);
}
