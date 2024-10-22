import { Command } from '@commander-js/extra-typings';
import { cli } from './cli';
import { logError } from './output';

const program = new Command('Flare Connector Utils');

console.log('Flare Connector Utils');

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
