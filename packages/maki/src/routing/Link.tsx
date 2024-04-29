import React from "react";
import { useRouter } from "./Router";

export type LinkProps = { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>;

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(({ href, onClick, ...props }, ref) => {
    const router = useRouter();

    return (
        <a
            ref={ref}
            href={href}
            {...props}
            onClick={(e) => {
                e.preventDefault();
                onClick?.(e);
                router.push(href);
            }}
            onMouseEnter={() => {
                router.preload(href);
            }}
        />
    );
});

export default Link;
