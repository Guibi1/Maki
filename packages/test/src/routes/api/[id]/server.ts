import { type } from "arktype";
import { endpoint } from "maki/server";

export const POST = endpoint(
    {
        body: type({ deep: "email" }),
        searchParams: type({ deep: "string" }),
    },
    ({ body, params }) => {
        console.log("POST CALLED");
        return { wow: false, body, params };
    },
);

export const GET = endpoint(
    {
        body: type({ "a?": "semver" }),
        searchParams: type({ a: ["string", "=>", (s) => Number.parseInt(s)] }),
    },
    async ({ body, searchParams, params }) => {
        console.log("GET CALLED");
        return { wow: true, body, params, searchParams };
    },
);

export const PUT = endpoint(
    {
        searchParams: type({ value: ["string", "=>", (s) => Number.parseInt(s)] }),
    },
    async ({ searchParams, params }) => {
        console.log("PUT CALLED");
        return { wow: true, params, searchParams };
    },
);
