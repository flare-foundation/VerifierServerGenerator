import { Command } from '@commander-js/extra-typings';
import {
  generateVerificationInterfaceContracts,
  generateVerificationContracts,
} from './renders/verification-contract';

export async function cli(program: Command) {
  program
    .command('verification-contract')
    .description(
      "Generates verification smart contracts and its interface in the output folder. The contracts have names of the form '<attestationTypeName>Verification.sol'.",
    )
    .option(
      '-t --type <attestationType>',
      'Generates the verification contract for a specific attestation type only.',
    )
    .action((options) => {
      try {
        generateVerificationInterfaceContracts(options?.type);
        generateVerificationContracts(options?.type);
      } catch (e: any) {
        console.error(e.toString());
        process.exit(1);
      }
    });
}
