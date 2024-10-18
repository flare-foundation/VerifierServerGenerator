import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import clear from "clear";
import figlet from "figlet";
import { cli } from "./cli";
import { logError } from "./output";

const program = new Command("Flare Connector Utils");

clear();
console.log(chalk.white(figlet.textSync("Flare Connector Utils")));

cli(program)
    .then(() => {
        program.parseAsync(process.argv).catch((err) => {
            if (err instanceof Error) {
                // logError(`Error: ${err.message}`)
                console.error(err);
            }
        });
    })
    .catch((err) => {
        logError(`Error: ${err.message}`);
    });
