export interface ImportStatement {
    defaultImport?: string;
    destructuredExports: string[];
    wildcardImports?: string;
    moduleIdentifier: string;
}

export interface ImportBlock {
    startIndex: number;
    endIndex: number;
    imports: ImportStatement[];
}

export interface SpecificVerifierCodeGenerationOptions {
    attestationTypeName: string;
    relativePathToServices?: string;
    relativePathToDtos?: string;
    relativePathToGenericDtos?: string;
    relativePathToExternalLibs?: string;
    oldCode?: string;
    dataSource?: string;
}

export interface VerifierCodeGenerationOptions {
    attestationTypes: string[];
    dataSources: string[];
    repoPath: string;
    appModuleRelativePath: string;
    dtoRelPath: string;
    dtoGenericRelPath: string;
    typeDefinitionsRelPath: string;
    exampleRelPath: string;
    exampleTSGeneratorsRelPath: string;
    externalLibsRelPath: string;
    servicesRelPath: string;
    controllersRelPath: string;
    clearAll?: boolean;
    controllerTests: boolean;
    customAuthGuard?: string;
    customAuthImport?: string;
    prefixDataSourceInRoute: boolean;
    testnetPrefix?: string;
}
// export interface VerifierCodeGenerationOptions
export const defaultSpecificVerifierCodeGenerationOptions = {
    relativePathToServices: "../service",
    relativePathToDtos: "../dto",
    relativePathToGenericDtos: "../dto",
};

export const defaultVerifierCodeGenerationOptions: VerifierCodeGenerationOptions = {
    attestationTypes: [],
    dataSources: [],
    repoPath: "../verifier-server-template",
    appModuleRelativePath: "src/app.module.ts",
    dtoRelPath: "src/dto",
    dtoGenericRelPath: "src/dto",
    typeDefinitionsRelPath: "type-definitions",
    exampleRelPath: "src/example-data",
    exampleTSGeneratorsRelPath: "src/example-data",
    externalLibsRelPath: "src/external-libs/ts",
    servicesRelPath: "src/service",
    controllersRelPath: "src/controller",
    clearAll: false,
    controllerTests: true,
    prefixDataSourceInRoute: true,
};
