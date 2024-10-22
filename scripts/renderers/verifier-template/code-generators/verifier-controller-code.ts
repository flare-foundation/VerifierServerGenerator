import { DO_NOT_CHANGE_NOTICE } from '../constants';
import {
  SpecificVerifierCodeGenerationOptions,
  VerifierCodeGenerationOptions,
  defaultSpecificVerifierCodeGenerationOptions,
} from '../interfaces';
import { toKebabCase } from '../utils';

export function verifierControllerCode(
  _options: SpecificVerifierCodeGenerationOptions,
  globalOptions: VerifierCodeGenerationOptions,
) {
  const options = {
    ...defaultSpecificVerifierCodeGenerationOptions,
    ..._options,
  };
  const content = `
${DO_NOT_CHANGE_NOTICE}    
   import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
   import { ApiSecurity, ApiTags } from "@nestjs/swagger";
   ${globalOptions.customAuthImport ?? 'import { ApiKeyAuthGuard } from "../../auth/apikey.guard";'}
   
   import { ${options.dataSource ?? ''}${options.attestationTypeName}VerifierService } from "${options.relativePathToServices}/${
     options.dataSource
       ? options.dataSource.toLowerCase() +
         '/' +
         options.dataSource.toLowerCase() +
         '-'
       : ''
   }${toKebabCase(options.attestationTypeName)}-verifier.service";
   import { AttestationResponseDTO_${options.attestationTypeName}_Response, ${options.attestationTypeName}_RequestNoMic } from "${options.relativePathToDtos}/${
     options.attestationTypeName
   }.dto";
   import { EncodedRequest, MicResponse, EncodedRequestResponse } from "${options.relativePathToGenericDtos}/generic.dto";
   
   @ApiTags("${options.attestationTypeName}")
   @Controller("${options.dataSource && globalOptions.prefixDataSourceInRoute ? options.dataSource.toLowerCase() + '/' : ''}${options.attestationTypeName}")   
   @UseGuards(${globalOptions.customAuthGuard ?? 'ApiKeyAuthGuard'})
   @ApiSecurity("X-API-KEY")
   export class ${options.dataSource ?? ''}${options.attestationTypeName}VerifierController {
       constructor(private readonly verifierService: ${options.dataSource ?? ''}${options.attestationTypeName}VerifierService) {}
   
       /**
        *
        * Tries to verify encoded attestation request without checking message integrity code, and if successful it returns response.
        * @param verifierBody
        * @returns
        */
       @HttpCode(200)
       @Post()
       async verify(@Body() body: EncodedRequest): Promise<AttestationResponseDTO_${options.attestationTypeName}_Response> {
           return this.verifierService.verifyEncodedRequest(body.abiEncodedRequest!);
       }
   
       /**
        * Tries to verify attestation request (given in JSON) without checking message integrity code, and if successful it returns response.
        * @param prepareResponseBody
        * @returns
        */
       @HttpCode(200)
       @Post('prepareResponse')
       async prepareResponse(@Body() body: ${options.attestationTypeName}_RequestNoMic): Promise<AttestationResponseDTO_${
         options.attestationTypeName
       }_Response> {
           return this.verifierService.prepareResponse(body);
       }
   
       /**
        * Tries to verify attestation request (given in JSON) without checking message integrity code, and if successful, it returns the correct message integrity code.
        * @param body
        */
       @HttpCode(200)
       @Post('mic')
       async mic(@Body() body: ${options.attestationTypeName}_RequestNoMic): Promise<MicResponse> {
           return this.verifierService.mic(body);
       }
   
       /**
        * Tries to verify attestation request (given in JSON) without checking message integrity code.
        * If successful, it returns the encoding of the attestation request with the correct message integrity code, which can be directly submitted to the State Connector contract.
        * @param body
        */
       @HttpCode(200)
       @Post('prepareRequest')
       async prepareRequest(@Body() body: ${options.attestationTypeName}_RequestNoMic): Promise<EncodedRequestResponse> {
           return this.verifierService.prepareRequest(body);
       }
   }   
`;
  return content;
}
