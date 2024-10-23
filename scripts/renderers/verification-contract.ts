import { mkdirSync, readdirSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import {
  TEMPORARY_CONTRACTS_PATH,
  TYPE_INTERFACE_DEFINITION_PATH,
  VERIFICATION_CONTRACTS_PATH,
} from '../constants';
import { getAttestationTypeASTs } from '../generate-utils';

export function mockVerificationForName(name: string): string {
  return (
    '' +
    `// SPDX-License-Identifier: MIT
  pragma solidity 0.8.20;
  
  import '../../../interfaces/types/I${name}.sol';
  import '../../interfaces/verification/I${name}Verification.sol';
  
  /**
   * Contract mocking verifying ${name} attestations.
   */
  contract ${name}Verification is I${name}Verification {
  
     /**
      * @inheritdoc I${name}Verification
      */
     function verify${name}(
        I${name}.Proof calldata _proof
     ) external pure returns (bool _proved) {
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
  
  import "../../../interfaces/types/I${name}.sol";
  
  
  interface I${name}Verification {
     function verify${name}(
        I${name}.Proof calldata _proof
     ) external view returns (bool _proved);
  }
     `
  );
}

export function getTemporaryContractCodeForName(name: string): string {
  return (
    '' +
    `// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../../interfaces/types/I${name}.sol";

contract I${name}Temporary {
  function request(I${name}.Request calldata _request) public pure {}
  function response(I${name}.Response calldata _response) public pure {}
  function proof(I${name}.Proof calldata _proof) public pure {}
}
  `
  );
}

export function generateVerificationContracts(
  specific?: string,
  outPath: string = VERIFICATION_CONTRACTS_PATH,
): void {
  const astMap = getAttestationTypeASTs();
  astMap.forEach((ast, fileName) => {
    if (!specific || (specific && fileName === specific)) {
      const nameWithI = basename(fileName, '.sol');

      const name = nameWithI.replace('I', '');

      mkdirSync(outPath, { recursive: true });
      writeFileSync(
        `${outPath}/${name}Verification.sol`,
        mockVerificationForName(name),
      );
    }
  });
}

export function generateVerificationInterfaces(
  specific?: string,
  outPath: string = join(
    'contracts',
    'generated',
    'interfaces',
    'verification',
  ),
): void {
  const astMap = getAttestationTypeASTs();
  astMap.forEach((ast, fileName) => {
    if (!specific || (specific && fileName === specific)) {
      const nameWithI = basename(fileName, '.sol');

      const name = nameWithI.replace('I', '');

      mkdirSync(outPath, { recursive: true });
      writeFileSync(
        `${outPath}/I${name}Verification.sol`,
        mockVerificationInterfaceForName(name),
      );
    }
  });
}

export function generateTemporaryContracts(
  outPath: string = TEMPORARY_CONTRACTS_PATH,
  specific?: string,
): void {
  let typeNames = readdirSync(TYPE_INTERFACE_DEFINITION_PATH);

  typeNames.forEach((fileName) => {
    if (!specific || (specific && fileName === specific)) {
      let name = basename(fileName, '.sol').replace('I', '');

      console.log(`Temp contract for ${name}`);

      mkdirSync(outPath, { recursive: true });
      writeFileSync(
        `${outPath}/I${name}Temporary.sol`,
        getTemporaryContractCodeForName(name),
      );
    }
  });
}
