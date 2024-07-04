import type { RootLayoutProps } from "maki";
import Counter from "../components/Counter";
import "../global.css";
import MakiLogo from "../maki.svg";

export default function RootLayout({ children, head }: RootLayoutProps) {
    return (
        <html lang="en">
            <head>
                {head}
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="color-scheme" content="light dark" />
                <link rel="icon" type="image/svg-xml" href={MakiLogo} />
            </head>

            <body>
                <h1>Root layout </h1>
                <Counter />

                {children}
            </body>
        </html>
    );
}
