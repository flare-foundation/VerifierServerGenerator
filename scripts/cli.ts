import { Command } from '@commander-js/extra-typings';
import { execSync } from 'child_process';
import { rmSync } from 'fs';
import path from 'path/posix';
import { rimrafSync } from 'rimraf';
import {
  CONFIGS_PATH,
  RELATIVE_VERIFICATION_CONTRACTS_INTERFACES_PATH,
  TEMPORARY_CONTRACTS_PATH,
  TS_TYPES_PATH,
  VERIFICATION_CONTRACTS_PATH,
} from './constants';
import { generateABIConfigs, generateDTOs } from './generate-utils';
import { logError, logInfo, logSuccess } from './output';
import { generateTSTypes } from './renderers/ts-type';
import {
  generateTemporaryContracts,
  generateVerificationContracts,
  generateVerificationInterfaces,
} from './renderers/verification-contract';

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

        generateDTOs();

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

  program
    .command('verification-contract')
    .description(
      "Generates verification smart contracts in the output folder. The contracts have names of the form '<attestationTypeName>Verification.sol'.",
    )
    .option(
      '-t --type <attestationType>',
      'Generates the verification contract for a specific attestation type only.',
    )
    .option(
      '-f --force-compile',
      'Forces cleaning and compilation of interfaces and smart contracts prior and compilation after to generation of verification contract',
    )
    .option(
      '-o --outPath',
      `Path to output directory. Default value is '${VERIFICATION_CONTRACTS_PATH}'`,
      VERIFICATION_CONTRACTS_PATH,
    )
    .action((options) => {
      try {
        if (options?.forceCompile) {
          logInfo(`Cleaning ...`);
          execSync('yarn hardhat clean', { stdio: 'inherit' });
          rmSync(options.outPath! as string, { recursive: true, force: true });
          logInfo(`Compiling contracts...`);
          execSync('yarn hardhat compile --force', { stdio: 'inherit' });
          logSuccess(`Contracts compiled`);
        }
        logInfo('Generating interfaces and verification contracts...');
        generateVerificationInterfaces(
          path.join(
            options.outPath! as string,
            RELATIVE_VERIFICATION_CONTRACTS_INTERFACES_PATH,
          ),
          options?.type,
        );
        generateVerificationContracts(
          options.outPath! as string,
          options?.type,
        );
        if (options?.forceCompile) {
          logInfo(`Cleaning ...`);
          execSync('yarn hardhat clean', { stdio: 'inherit' });
          logInfo(`Compiling contracts...`);
          execSync('yarn hardhat compile --force', { stdio: 'inherit' });
          logSuccess(`Contracts compiled`);
        }
        logSuccess(
          `Verification contracts generated in '${options.outPath! as string}'`,
        );
      } catch (e: any) {
        logError(e.toString());
        process.exit(1);
      }
    });

  program
    .command('ts-type')
    .description(
      'Generates Typescript type definitions for all attestation types or just a specific one, specifically for attestation requests, responses and proofs.',
    )
    .option(
      '-t --type <attestationType>',
      'Generates Typescript type definitions for a specific attestation type only.',
    )
    .option(
      '-o --outPath <outPath>',
      `Path to output directory. Default value is '${TS_TYPES_PATH}'`,
      TS_TYPES_PATH,
    )
    .action(async (options) => {
      try {
        logInfo(`Assuming configs are generated ...`);
        await generateTSTypes(options.outPath! as string, options?.type);
        logSuccess(`Typescript types generated in '${TS_TYPES_PATH}'`);
      } catch (e: any) {
        logError(e.toString());
        process.exit(1);
      }
    });
}
