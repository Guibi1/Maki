import type { Type } from "arktype";
import type { Prettify } from "../../types";

export type OutputTypeOfExistingKeys<T> = {
    [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K] extends Type ? T[K]["tOut"] : never;
};

/**
 * Extracts the params from a string.
 * @see {@link ServerEndpointHandlerProps.params Props.params}
 */
export type MakiServerEndpointParams<Pathname extends string> = Pathname extends `/${infer Rest}`
    ? ExtractParamsFromPath<Rest> extends never
        ? Record<never, never>
        : { params: Record<ExtractParamsFromPath<Rest>, string> }
    : Record<never, never>;

type ExtractParamsFromPath<Path extends string> = Path extends `[${infer Param}]/${infer Rest}`
    ? Param | ExtractParamsFromPath<Rest>
    : Path extends `[${infer Param}]`
      ? Param
      : Path extends `${infer _}/${infer Rest}`
        ? ExtractParamsFromPath<Rest>
        : never;

export type ServerEndpointHandlerProps = {
    /**
     * The Web Request received as-is by Maki.
     *
     * @see {@link https://developer.mozilla.org/docs/Web/API/Request MDN Reference}
     */
    request: Request;

    /**
     * The path of the current endpoint.
     *
     * @example "/api/user/[id]"
     * @see {@link ServerEndpointHandlerProps.params Props.params}
     */
    route: string;

    /**
     * The url parameters of the current endpoint.
     *
     * @example { id: 1234 }
     * @see {@link ServerEndpointHandlerProps.route Props.route}
     */
    params: Record<string, string>;
};

export type ServerEndpointHandler<Validators extends ServerEndpointValidators<Type, Type>, Res> = (
    props: Prettify<ServerEndpointHandlerProps & OutputTypeOfExistingKeys<Validators>>,
) => Res;

export type ServerEndpointValidators<Body extends Type, Search extends Type> = {
    body?: Body;
    searchParams?: Search;
};

/**
 * A type-safe server endpoint.
 */
export type TypeSafeServerEndpointHandler<
    Validators extends ServerEndpointValidators<Type, Type> = ServerEndpointValidators<Type, Type>,
    Res = unknown,
> = {
    validators: Validators;
    handler: ServerEndpointHandler<Validators, Res>;
};

/**
 * A server endpoint, either type-safe or not.
 */
export type ServerEndpoint =
    | TypeSafeServerEndpointHandler
    | ((props: ServerEndpointHandlerProps) => Response | Promise<Response>);

// * HTTP Methods *
const HttpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

/**
 * The HTTP Methods which are handled by the Maki router.
 */
export type HttpMethod = (typeof HttpMethods)[number];

/**
 * Casts a string to an {@link HttpMethod}.
 */
export function isHttpMethod(m: string): m is HttpMethod {
    return HttpMethods.includes(m as HttpMethod);
}
