import type { Method } from "@/types";
import { msDeltaTime } from "@/utils";
import chalk from "chalk";

function getTime() {
    return chalk.dim(new Date().toLocaleTimeString());
}

export default {
    request(method: Method, url: URL) {
        console.log(getTime(), chalk.hex("#cba6f7")(method), url.pathname);
    },
    fileChange(fileName: string) {
        console.log(
            "\n",
            getTime(),
            chalk.hex("#1e1e2e").bgHex("#94e2d5")(" watch "),
            chalk.underline(fileName),
            "modified...",
        );
    },
    hmr(message: string) {
        console.log(getTime(), chalk.hex("#1e1e2e").bgHex("#eba0ac")(" hmr "), message);
    },
    buildComplete(startTime: number, message: string) {
        console.log(chalk.hex("#1e1e2e").bgHex("#b4befe")(` ${msDeltaTime(startTime)}ms `), message);
    },
};

/**
 * Some standard terminal styling and colors.
 */
export const colors = {
    link(link: string) {
        return chalk.hex("#89b4fa").underline(link);
    },
};
