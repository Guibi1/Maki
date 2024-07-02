// import "server-only";
import type { Type } from "arktype";
import type {
    ServerEndpointHandler,
    ServerEndpointValidators,
    TypeSafeServerEndpointHandler,
} from "../server/endpoints/types";

/**
 * Creates a type-safe server endpoint that can handle HTTP requests.
 * @param validators The ArkType validators for the request's `body` and `URLSearchParams`
 * @param handler The endpoint handler
 * @returns A well-formed and type-safe server endpoint
 */
export function endpoint<Validators extends ServerEndpointValidators<Type, Type>, Res>(
    validators: Validators,
    handler: ServerEndpointHandler<Validators, Res>,
): TypeSafeServerEndpointHandler<Validators, Res> {
    return {
        validators,
        handler,
    };
}
