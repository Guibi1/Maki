import React from "react";

export type LinkProps = { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>;

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(({ href, onClick, ...props }, ref) => {
    return <a ref={ref} href={href} {...props} />;
});

export default Link;
