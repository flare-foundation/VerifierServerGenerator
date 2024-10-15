import { Command } from '@commander-js/extra-typings';
import { cli } from './cli';

const program = new Command('Flare Connector Utils');

cli(program)
  .then(() => {
    console.log(process.argv);
    program.parseAsync(process.argv).catch((err) => {
      if (err instanceof Error) {
        // logError(`Error: ${err.message}`)
        console.error(err);
      }
    });
  })
  .catch((err) => {
    console.error(`Error: ${err.message}`);
  });
