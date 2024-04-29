import type { Attributes, FunctionComponent, ReactNode } from "react";
import React from "react";

/**
 * Renders a React Component without type warnings.
 * @param component The React Component to render
 * @param props The props to pass on render
 * @param children The children of the component
 * @returns The rendered component
 */
export function jsx<P extends {}>(
    component: FunctionComponent<P>,
    props: Omit<P, "children"> & Attributes,
    ...children: ReactNode[]
) {
    return React.createElement(component, props as P, ...children);
}
