import { Command } from '@commander-js/extra-typings';
import { execSync } from 'child_process';
import { rimrafSync } from 'rimraf';
import { CONFIGS_PATH, TEMPORARY_CONTRACTS_PATH } from './constants';
import {
  generateABIConfigs,
  generateDTOs,
  generateVerifierServers,
} from './generate-utils';
import { logError, logInfo, logSuccess } from './output';
import { generateTemporaryContracts } from './renderers/verification-contract';

export async function cli(program: Command) {
  program
    .command('config')
    .description(
      'Generates configurations containing JSON ABI definitions (request, response, proof) for all attestation types or just a specific one.',
    )
    .option(
      '-t --type <attestationType>',
      'Generates extended ABI configuration for a specific attestation type only.',
    )
    .option(
      '-o --outPath <outPath>',
      `Path to output directory. Default value is '${CONFIGS_PATH}'`,
      CONFIGS_PATH,
    )
    .action((options) => {
      try {
        logInfo(`Cleaning ...`);
        execSync('yarn hardhat clean', { stdio: 'inherit' });
        logInfo(`Compiling contracts...`);
        logInfo('Generating temporary contracts...');
        generateTemporaryContracts(TEMPORARY_CONTRACTS_PATH, options?.type);
        logInfo(`Cleaning ...`);
        execSync('yarn hardhat clean', { stdio: 'inherit' });
        logInfo(`Compiling contracts...`);
        execSync('yarn hardhat compile --force', { stdio: 'inherit' });
        logSuccess(`Contracts compiled`);
        generateABIConfigs(options.outPath! as string, options?.type);

        logInfo(`Generating dtos`);
        generateDTOs();

        logInfo(`Generating servers`);
        generateVerifierServers();

        rimrafSync(TEMPORARY_CONTRACTS_PATH);
        logSuccess(`Temporary contracts removed`);
        logSuccess(
          `Configurations generated in '${options.outPath! as string}'`,
        );
      } catch (e: any) {
        logError(e.toString());
        process.exit(1);
      }
    });
}
