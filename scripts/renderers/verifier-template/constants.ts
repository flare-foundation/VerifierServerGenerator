import { Options } from "prettier";
import { VerifierCodeGenerationOptions } from "./interfaces";

export const PRETTIER_SETTINGS_VERIFIER_CODE: Options = {
    trailingComma: "all",
    tabWidth: 4,
    printWidth: 160,
    semi: true,
    singleQuote: false,
    parser: "typescript",
};

export const DEFAULT_VERIFIER_SERVER_TEMPLATE_PATH = "../verifier-server-template";
export const DEFAULT_VERIFIER_SERVER_TEMPLATE_APP_MODULE_RELATIVE_PATH = "src/app.module.ts";
export const DO_NOT_CHANGE_NOTICE = `
///////////////////////////////////////////////////////////////
// THIS IS GENERATED CODE. DO NOT CHANGE THIS FILE MANUALLY .//
///////////////////////////////////////////////////////////////
`;

export const testnetPrefix = `(process.env.TESTNET ? "test" : "") + `;

//////////////////////////////////////////////////////////////////////////////////////////
// Default options
//////////////////////////////////////////////////////////////////////////////////////////

export function defaultAttestationClientVerifierCodeGenerationOptions(dataSource: string): VerifierCodeGenerationOptions {
    return {
        attestationTypes: [],
        dataSources: [],
        repoPath: "../attestation-client",
        appModuleRelativePath: `src/servers/verifier-server/src/verifier-${dataSource.toLowerCase()}-server.module.ts`,
        dtoRelPath: "src/servers/verifier-server/src/dtos/attestation-types",
        dtoGenericRelPath: "src/servers/verifier-server/src/dtos/generic",
        typeDefinitionsRelPath: "configs/type-definitions",
        exampleRelPath: "src/servers/verifier-server/src/example-data",
        exampleTSGeneratorsRelPath: "test/random-example-generators",
        externalLibsRelPath: "src/external-libs",
        servicesRelPath: "src/servers/verifier-server/src/services",
        controllersRelPath: "src/servers/verifier-server/src/controllers",
        clearAll: false,
        controllerTests: false, // due to different testing setup in attestation client
        customAuthGuard: `AuthGuard("api-key")`,
        customAuthImport: `import { AuthGuard } from "@nestjs/passport";`,
        prefixDataSourceInRoute: false, // specific setup for attestation client,
        testnetPrefix,
    };
}

export function defaultAttestationClientLibsAndDefsConfig(): VerifierCodeGenerationOptions {
    return {
        attestationTypes: [],
        dataSources: [],
        repoPath: "../attestation-client",
        appModuleRelativePath: "",
        dtoRelPath: "",
        dtoGenericRelPath: "",
        typeDefinitionsRelPath: "configs/type-definitions",
        exampleRelPath: "",
        exampleTSGeneratorsRelPath: "",
        externalLibsRelPath: "src/external-libs",
        servicesRelPath: "",
        controllersRelPath: "",
        clearAll: false,
        controllerTests: false, // due to different testing setup in attestation client
        customAuthGuard: "",
        customAuthImport: "",
        prefixDataSourceInRoute: false, // specific setup for attestation client
    };
}

//////////////////////////////////////////////////////////////////////////////////////////
// For devs: support that is provided for verifiers implemented in the
// attestation client project
//////////////////////////////////////////////////////////////////////////////////////////
export const verifierAttestationTypes = [
    "Payment",
    "BalanceDecreasingTransaction",
    "ConfirmedBlockHeightExists",
    "ReferencedPaymentNonexistence",
    "AddressValidity",
];
export const verifierDataSources = ["BTC", "DOGE", "XRP"];

//////////////////////////////////////////////////////////////////////////////////////////
// Misc
//////////////////////////////////////////////////////////////////////////////////////////
export const attestationResponseStatusEnum = `
/**
 * Attestation status
 */
export enum AttestationResponseStatus {
    /**
     * Attestation request is valid.
     */
    VALID = "VALID",
    /**
     * Attestation request is invalid.
     */
    INVALID = "INVALID",
    /**
     * Attestation request cannot be confirmed neither rejected by the verifier at the moment.
     */
    INDETERMINATE = "INDETERMINATE",
}
`;
