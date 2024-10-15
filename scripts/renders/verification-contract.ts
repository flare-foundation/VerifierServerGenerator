import { readFile, writeFile } from 'fs';

export function mockVerificationForName(name: string): string {
  return (
    '' +
    `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import '../../../configs/contracts/I${name}.sol';
import '../interface/I${name}Verification.sol';
import {MerkleProof} from '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';

/**
 * Contract mocking verifying ${name} attestations.
 */
contract ${name}Verification is I${name}Verification {

   /**
    * @inheritdoc I${name}Verification
    */
   function verify${name}(
      I${name}.Proof calldata _proof
   ) external view returns (bool _proved) {
      return _proof.data.attestationType == bytes32("${name}");
   }
}
   `
  );
}

export function mockVerificationInterfaceForName(name: string): string {
  return (
    '' +
    `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../../../configs/contracts/I${name}.sol";


interface I${name}Verification {
   function verify${name}(
      I${name}.Proof calldata _proof
   ) external view returns (bool _proved);
}
   `
  );
}

export function generateVerificationInterfaceContracts(name: string): void {
  writeFile(
    `./generated/contracts/interface/I${name}Verification.sol`,
    mockVerificationInterfaceForName(name),
    (err) => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    },
  );
}

export function generateVerificationContracts(name: string): void {
  writeFile(
    `./generated/contracts/implementation/${name}Verification.sol`,
    mockVerificationForName(name),
    (err) => {
      if (err) {
        console.error(err);
      } else {
        // file written successfully
      }
    },
  );
}
