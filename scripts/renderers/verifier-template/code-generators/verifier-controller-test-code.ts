import { SpecificVerifierCodeGenerationOptions, defaultSpecificVerifierCodeGenerationOptions } from "../interfaces";
import { toKebabCase } from "../utils";

export function verifierControllerTestCode(_options: SpecificVerifierCodeGenerationOptions) {
    const options = { ...defaultSpecificVerifierCodeGenerationOptions, ..._options };
    const standardImports = `
    import { Test, TestingModule } from "@nestjs/testing";
    import { ${options.dataSource ?? ""}${options.attestationTypeName}VerifierService } from "${options.relativePathToServices}/${
        options.dataSource ? options.dataSource.toLowerCase() + "/" + options.dataSource.toLowerCase() + "-" : ""
    }${toKebabCase(options.attestationTypeName)}-verifier.service";
    import { ${options.dataSource ?? ""}${options.attestationTypeName}VerifierController } from "./${
        options.dataSource ? options.dataSource.toLowerCase() + "-" : ""
    }${toKebabCase(options.attestationTypeName)}-verifier.controller";
    import { readFileSync } from "fs";
    import { ExampleData } from "${options.relativePathToExternalLibs}/interfaces";
    import { ${options.attestationTypeName}_RequestNoMic, ${options.attestationTypeName}_Request, ${options.attestationTypeName}_Response} from "${
        options.relativePathToDtos
    }/${options.attestationTypeName}.dto"; 
`;
    const content = `
   ${standardImports}
   describe("AppController", () => {
       let appController: ${options.dataSource}${options.attestationTypeName}VerifierController;
       let exampleData: ExampleData<${options.attestationTypeName}_RequestNoMic, ${options.attestationTypeName}_Request, ${options.attestationTypeName}_Response>;
   
       beforeEach(async () => {
           const app: TestingModule = await Test.createTestingModule({
               controllers: [${options.dataSource}${options.attestationTypeName}VerifierController],
               providers: [${options.dataSource}${options.attestationTypeName}VerifierService],
           }).compile();
   
           appController = app.get<${options.dataSource}${options.attestationTypeName}VerifierController>(${options.dataSource}${options.attestationTypeName}VerifierController);
           exampleData = JSON.parse(readFileSync("src/example-data/${options.attestationTypeName}.json", "utf8"));
       });
   
       describe("root", () => {
           it("should 'verify' pass", async () => {
               const actualRes = await appController.verify({
                   abiEncodedRequest: exampleData.encodedRequestZeroMic,
               });
               expect(actualRes.status).toEqual("VALID");
               expect(actualRes.response).toStrictEqual(exampleData.response);
           });
           it("should prepare response", async () => {
               const actualRes = await appController.prepareResponse(exampleData.requestNoMic);
               expect(actualRes.status).toEqual("VALID");
               expect(actualRes.response).toStrictEqual(exampleData.response);
           });
           it("should obtain 'mic'", async () => {
               const actualMic = await appController.mic({
                   ...exampleData.requestNoMic,
               });
               expect(actualMic.messageIntegrityCode).toStrictEqual(exampleData.messageIntegrityCode);
           });
           it("should prepare request", async () => {
               const actualRequest = await appController.prepareRequest(exampleData.requestNoMic);
               expect(actualRequest.abiEncodedRequest).toStrictEqual(exampleData.encodedRequest);
           });
       });
   });  
`;
    return content;
}
