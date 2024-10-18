import { SpecificVerifierCodeGenerationOptions, VerifierCodeGenerationOptions, defaultSpecificVerifierCodeGenerationOptions } from "../interfaces";
import { extractImports, mergeImports, renderImports } from "../imports-handling";
import { extractCode, isResponseDefined } from "../verifier-template";
import { encodeAttestationName } from "../../../../libs/ts/utils";

export function verifierServiceCode(_options: SpecificVerifierCodeGenerationOptions, globalOptions: VerifierCodeGenerationOptions) {
    const options = { ...defaultSpecificVerifierCodeGenerationOptions, ..._options };

    const startComment = "Start of custom code section. Do not change this comment.";
    const endComment = "End of custom code section. Do not change this comment.";

    const testnetPrefix = globalOptions.testnetPrefix ?? "";
    const defaultConstructor = `
    // Add additional class members here. 
    // Augment the constructor with additional (injected) parameters, if required. Update the constructor code.
    constructor() {
        this.store = new AttestationDefinitionStore("${globalOptions.typeDefinitionsRelPath}");
        this.exampleData = JSON.parse(readFileSync("${globalOptions.exampleRelPath}/${options.attestationTypeName}.json", "utf8"));
    }
    `;
    const verifyRequestInternalCode = `
    async verifyRequestInternal(request: ${options.attestationTypeName}_Request | ${options.attestationTypeName}_RequestNoMic): Promise<AttestationResponseDTO_${options.attestationTypeName}_Response> {
        if (request.attestationType !== encodeAttestationName("${options.attestationTypeName}") || request.sourceId !== encodeAttestationName(${testnetPrefix}"${options.dataSource}")){
            throw new HttpException(
                {
                    status: HttpStatus.BAD_REQUEST,
                    error: \`Attestation type and source id combination not supported: (\${request.attestationType}, \${request.sourceId}). This source supports attestation type '${options.attestationTypeName}' (\${encodeAttestationName("${options.attestationTypeName}")}) and source id '\${${testnetPrefix}"${options.dataSource}"}' (\${encodeAttestationName(${testnetPrefix}"${options.dataSource}"
                    )}).\`,
                },
                HttpStatus.BAD_REQUEST
            );
        }

        const fixedRequest = {
            ...request,
        } as ${options.attestationTypeName}_Request;
        if (!fixedRequest.messageIntegrityCode) {
            fixedRequest.messageIntegrityCode = ZERO_BYTES_32;
        }
        
        return this.verifyRequest(fixedRequest); 
    }

    `;

    const defaultVerifyRequestCode = `
    return {
        status: AttestationResponseStatus.VALID,
        response: {
            ...this.exampleData.response,
            attestationType: fixedRequest.attestationType,
            sourceId: fixedRequest.sourceId,
            requestBody: serializeBigInts(fixedRequest.requestBody),
            lowestUsedTimestamp: "0xffffffffffffffff",
        } as ${options.attestationTypeName}_Response
    };        

    `;
    const introCode = extractCode(options.oldCode ?? "", "constructor");
    const verifyRequestCode = extractCode(options.oldCode ?? "", "verifyRequest");

    const standardImports = `
    import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
    import { readFileSync } from "fs";
    import { ExampleData } from "${options.relativePathToExternalLibs}/interfaces";
    import {  AttestationResponseDTO_${options.attestationTypeName}_Response, ${options.attestationTypeName}_Request, ${options.attestationTypeName}_RequestNoMic, ${options.attestationTypeName}_Response } from "${options.relativePathToDtos}/${options.attestationTypeName}.dto";
    import { AttestationDefinitionStore } from "${options.relativePathToExternalLibs}/AttestationDefinitionStore";
    import { AttestationResponseStatus } from "${options.relativePathToExternalLibs}/AttestationResponse";
    import { EncodedRequestResponse, MicResponse } from "${options.relativePathToGenericDtos}/generic.dto";
    import { MIC_SALT, ZERO_BYTES_32, encodeAttestationName, serializeBigInts } from "${options.relativePathToExternalLibs}/utils";
    `;

    const extractedImportObjects = extractImports(options.oldCode ?? "");
    const standardImportObjects = extractImports(standardImports);
    const mergedImportObjects = mergeImports([...standardImportObjects.imports, ...extractedImportObjects.imports]);
    const mergedImports = renderImports(mergedImportObjects);

    const content = `
   ${mergedImports}

   @Injectable()
   export class ${options.dataSource ?? ""}${options.attestationTypeName}VerifierService {
       store!: AttestationDefinitionStore;
       exampleData!: ExampleData<${options.attestationTypeName}_RequestNoMic, ${options.attestationTypeName}_Request, ${options.attestationTypeName}_Response>;

       //-$$$<start-constructor> ${startComment}

       ${introCode ?? defaultConstructor}
       
       //-$$$<end-constructor> ${endComment}
   
       ${verifyRequestInternalCode}

       async verifyRequest(fixedRequest: ${options.attestationTypeName}_Request): Promise<AttestationResponseDTO_${options.attestationTypeName}_Response> {
        //-$$$<start-verifyRequest> ${startComment}

        ${verifyRequestCode ?? defaultVerifyRequestCode}
        
        //-$$$<end-verifyRequest> ${endComment}        
       }

       public async verifyEncodedRequest(abiEncodedRequest: string): Promise<AttestationResponseDTO_${options.attestationTypeName}_Response> {
           const requestJSON = this.store.parseRequest<${options.attestationTypeName}_Request>(abiEncodedRequest);   
           const response = await this.verifyRequestInternal(requestJSON);
           return response;
       }
   
       public async prepareResponse(request: ${options.attestationTypeName}_RequestNoMic): Promise<AttestationResponseDTO_${
           options.attestationTypeName
       }_Response> {              
           const response = await this.verifyRequestInternal(request);              
           return response;   
       }
   
       public async mic(request: ${options.attestationTypeName}_RequestNoMic): Promise<MicResponse> {   
           const result = await this.verifyRequestInternal(request);
           if (result.status !== AttestationResponseStatus.VALID) {
               return new MicResponse({ status: result.status });
           }
           const response = result.response;    
           if (!response) return new MicResponse({ status: result.status });
        return new MicResponse({
            status: AttestationResponseStatus.VALID,
            messageIntegrityCode: this.store.attestationResponseHash<${options.attestationTypeName}_Response>(response, MIC_SALT),
        });
       }
   
       public async prepareRequest(request: ${options.attestationTypeName}_RequestNoMic): Promise<EncodedRequestResponse> {
            const result = await this.verifyRequestInternal(request);
            if (result.status !== AttestationResponseStatus.VALID) {
                return new EncodedRequestResponse({ status: result.status });
            }
            const response = result.response;
        
            if (!response) return new EncodedRequestResponse({ status: result.status });
            const newRequest = {
                ...request,
                messageIntegrityCode: this.store.attestationResponseHash<${options.attestationTypeName}_Response>(response, MIC_SALT)!,
            } as ${options.attestationTypeName}_Request;
   
            return new EncodedRequestResponse({
                status: AttestationResponseStatus.VALID,
                abiEncodedRequest: this.store.encodeRequest(newRequest),
            });
       }
   }
`;
    return content;
}
