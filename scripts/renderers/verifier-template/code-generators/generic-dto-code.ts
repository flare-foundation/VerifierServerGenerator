import {
  DO_NOT_CHANGE_NOTICE,
  attestationResponseStatusEnum,
} from '../constants';
import {
  VerifierCodeGenerationOptions,
  defaultVerifierCodeGenerationOptions,
} from '../interfaces';

export function genericDTOCode(_options: VerifierCodeGenerationOptions) {
  const options = { ...defaultVerifierCodeGenerationOptions, ..._options };
  const content = `
    ${DO_NOT_CHANGE_NOTICE}
    
    ${attestationResponseStatusEnum}
    
    /**
     * This is a general object definition independent of the attestation type this verifier is implementing
     */
    export class EncodedRequestResponse {
        constructor(params: { status: AttestationResponseStatus; abiEncodedRequest?: string }) {
            Object.assign(this, params);
        }
    
        /**
         * Verification status.
         */
        status: AttestationResponseStatus;
    
        /**
         * Abi encoded request object see this for more info: https://gitlab.com/flarenetwork/state-connector-protocol/-/blob/main/attestation-objects/request-encoding-decoding.md
         */
        abiEncodedRequest?: string;
    }
    
    export class EncodedRequest {
        /**
         * Abi encoded request object see this for more info: https://gitlab.com/flarenetwork/state-connector-protocol/-/blob/main/attestation-objects/request-encoding-decoding.md
         */
        abiEncodedRequest: string;
    }

    export class MicResponse {
        constructor(params: { status: AttestationResponseStatus; messageIntegrityCode?: string }) {
            Object.assign(this, params);
          } 

        /**
         * Verification status.
         */
        status: AttestationResponseStatus;

        /**
         * Message integrity code
         */
        messageIntegrityCode?: string;
    }
    `;
  return content;
}
