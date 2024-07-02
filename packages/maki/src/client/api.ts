import type { Type } from "arktype";
import type { HttpMethod, MakiServerEndpointParams, TypeSafeServerEndpointHandler } from "../server/endpoints/types";

/**
 * Typesafe call to a maki api endpoint.
 * @param pathname The absolute URL of the endpoint
 * @param method The HTTP method to use
 * @param options The fetch's options
 * @returns An object containing the status, the response and the returned data.
 */
export async function api<
    Pathname extends keyof MakiServerEndpoints,
    Method extends keyof MakiServerEndpoints[Pathname] & HttpMethod,
>(
    pathname: Pathname,
    method: Method,
    options: MakiServerEndpoints[Pathname][Method][keyof MakiServerEndpoints[Pathname][Method] & "params"] &
        Omit<FetchRequestInit, "body" | "method"> &
        MakiServerEndpointParams<Pathname>,
): Promise<
    | { ok: false; response: Response }
    | {
          ok: true;
          response: Response;
          data: MakiServerEndpoints[Pathname][Method][keyof MakiServerEndpoints[Pathname][Method] & "return"];
      }
> {
    // TODO: HANDLE WEB VS SERVER
    const url = new URL(pathname, "http://localhost:3000");
    if ("searchParams" in options && options.searchParams) {
        url.search = new URLSearchParams(Object.entries(options.searchParams)).toString();
    }

    const init: FetchRequestInit =
        "body" in options
            ? {
                  ...options,
                  method,
                  headers: { ...options?.headers, "Content-Type": "application/json" },
                  body: JSON.stringify(options.body),
              }
            : { ...options, method };
    const res = await fetch(url, init);

    if (!res.ok) return { ok: false, response: res };

    return {
        ok: true,
        response: res,
        data: await res.json(),
    };
}

/**
 * A utility type that creates the structure that powers the {@link api Maki Type-Safe API} from a module import.
 */
export type MakiServerEndpoint<Module extends Record<string, unknown>> = {
    [Method in Extract<keyof Module, HttpMethod>]: Module[Method] extends TypeSafeServerEndpointHandler<
        infer V,
        infer Res
    >
        ? {
              return: Awaited<Res>;
              params: (V extends { body: Type } ? { body: V["body"]["tIn"] } : Record<never, never>) &
                  (V extends { searchParams: Type }
                      ? { searchParams: V["searchParams"]["tIn"] }
                      : Record<never, never>);
          }
        : never;
};
