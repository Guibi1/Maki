import type { ReactNode } from "react";
import Counter from "../components/Counter";
import Style from "./main.css";
import MakiLogo from "./maki.svg";
import "./main.css";

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="color-scheme" content="light dark" />
                <link rel="icon" type="image/svg-xml" href={MakiLogo} />
                <link rel="stylesheet" href={Style} />
            </head>

            <body>
                <h1 className="test">Root layout </h1>
                <Counter />

                {children}
            </body>
        </html>
    );
}
