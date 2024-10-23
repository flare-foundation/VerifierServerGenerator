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
import {
  generateTemporaryContracts,
  generateVerificationContracts,
  generateVerificationInterfaces,
} from './renderers/verification-contract';

export async function cli(program: Command) {
  program
    .command('server')
    .description(
      'Generates server templates for all attestation types or just the provided ones. Any previously generated files for the types will be overwritten',
    )
    .option(
      '-t --type <attestationType>',
      'Generates server for a specific attestation type only.',
    )
    .action((options) => {
      try {
        logInfo(`Cleaning ...`);
        execSync('yarn hardhat clean', { stdio: 'inherit' });
        logInfo(`Compiling contracts...`);
        logInfo('Generating temporary contracts...');
        generateTemporaryContracts(TEMPORARY_CONTRACTS_PATH);
        logInfo(`Compiling contracts...`);
        execSync('yarn hardhat compile --force', { stdio: 'inherit' });
        logSuccess(`Contracts compiled`);
        generateABIConfigs(options?.type);

        logInfo(`Generating dtos`);
        generateDTOs();

        logInfo(`Generating servers`);
        generateVerifierServers(options?.type);

        logInfo(`Generating verification contracts`);
        generateVerificationContracts(options?.type);
        generateVerificationInterfaces(options?.type);

        rimrafSync(TEMPORARY_CONTRACTS_PATH);
        logSuccess(`Temporary contracts removed`);
        logSuccess(`Servers generated`);
      } catch (e: any) {
        logError(e.toString());
        process.exit(1);
      }
    });

  program
    .command('config')
    .description('updates or creates config files for attestation types')
    .action(() => {
      logInfo(`Cleaning ...`);
      execSync('yarn hardhat clean', { stdio: 'inherit' });
      logInfo(`Compiling contracts...`);
      logInfo('Generating temporary contracts...');
      generateTemporaryContracts(TEMPORARY_CONTRACTS_PATH);
      logInfo(`Compiling contracts...`);
      execSync('yarn hardhat compile --force', { stdio: 'inherit' });
      logSuccess(`Contracts compiled`);
      generateABIConfigs();

      logInfo(`Generating dtos`);
      generateDTOs();
    });
}
