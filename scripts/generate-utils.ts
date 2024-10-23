import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import path, { basename, join } from 'path/posix';
import type { SourceUnit, StructDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import {
  ABIDefinitions,
  ParamRecord,
  StructRecord,
  TypeRecord,
} from '../external-libs/config-types';
import {
  ABI_PATH,
  CONFIGS_PATH,
  DTO_PATH,
  TEMPORARY_CONTRACTS_COMPILATION_PATH,
  TEMPORARY_CONTRACTS_PATH,
  TYPE_INTERFACE_DEFINITION_PATH,
} from './constants';
import { logError } from './output';
import { getDTOsForName } from './renderers/dto';
import { generateVerifierServer } from './renderers/verifier-server';

/**
 * Extracts Solc compiler output from artifacts/build-info.
 * It expects exactly one file in the directory.
 * Hence clean builds should be used. E.g.
 * yarn hardhat clean
 * yarn hardhat compile --force
 * @returns
 */
function getSolcOutputs() {
  const files = readdirSync('artifacts/build-info');
  if (files.length !== 1) {
    throw new Error('Expected exactly one file in artifacts/build-info');
  }
  return JSON.parse(readFileSync(`artifacts/build-info/${files[0]}`, 'utf8'))
    .output;
}

/**
 * Returns a map of ASTs for all attestation types.
 * ASTs are extracted from `build-info`. It is assumed that the solc compiler is configured
 * to produce ASTs as a part of build info.
 * The map is keyed by the name of the attestation type.
 * @returns
 */
export function getAttestationTypeASTs(): Map<string, SourceUnit> {
  const solcOutput = getSolcOutputs();
  const files = readdirSync(TYPE_INTERFACE_DEFINITION_PATH);
  const astMap = new Map<string, SourceUnit>();
  files.forEach((fileName) => {
    const name = basename(fileName, '.sol');
    astMap.set(
      name,
      solcOutput.sources[`${TYPE_INTERFACE_DEFINITION_PATH}/${fileName}`].ast,
    );
  });
  return astMap;
}

/**
 * Extract ABI definitions for all attestation types and puts them into a map: attestationType -> ABIDefinitions
 * @returns
 */
function getTemporaryABIMap(): Map<string, ABIDefinitions> {
  const files = readdirSync(TEMPORARY_CONTRACTS_PATH);
  const abiMap = new Map<string, ABIDefinitions>();
  files.forEach((fileName) => {
    const name = basename(fileName, '.sol');
    const file = JSON.parse(
      readFileSync(
        `${TEMPORARY_CONTRACTS_COMPILATION_PATH}/${fileName}/${name}.json`,
        'utf8',
      ),
    );
    abiMap.set(name.slice(0, -'Temporary'.length), {
      requestAbi: file.abi.find((abi: any) => abi.name === 'request').inputs[0],
      responseAbi: file.abi.find((abi: any) => abi.name === 'response')
        .inputs[0],
      proofAbi: file.abi.find((abi: any) => abi.name === 'proof').inputs[0],
    });
  });
  return abiMap;
}

/**
 * Reads all attestation type configurations from JSON files and puts them into a map: attestationType -> TypeRecord
 * @param specific
 * @returns
 */
export function getTypeConfigMap(specific?: string): Map<string, TypeRecord> {
  const files = readdirSync(CONFIGS_PATH);
  const typeDefMap = new Map<string, TypeRecord>();
  files.forEach((fileName) => {
    if (specific && fileName !== `${specific}.json`) {
      return;
    }
    const typeName = basename(fileName, '.json');
    const file = JSON.parse(
      readFileSync(`${CONFIGS_PATH}/${fileName}`, 'utf8'),
    );
    typeDefMap.set(typeName, file);
  });
  return typeDefMap;
}

/**
 * Generates ABI attestation type configurations in JSON format and stores them to outPath.
 * @param outPath output path for generated files
 * @param specificType (optional) if specified as the attestation type name, only the ABI configuration for the specified type is generated
 */
export function generateABIConfigs(
  specificType?: string,
  outPath: string = CONFIGS_PATH,
  abiOutPath: string = ABI_PATH,
): void {
  const astMap = getAttestationTypeASTs();

  const configMap = getTemporaryABIMap();
  if (!specificType) {
    rmSync(outPath, { recursive: true, force: true });
  }

  astMap.forEach((ast, typeName) => {
    if (!specificType || (specificType && typeName === specificType)) {
      const config = getConfigForAST(ast);

      const abis = configMap.get(typeName);
      if (!abis) {
        throw new Error(`Could not find ABI for ${typeName}`);
      }
      config.requestAbi = abis.requestAbi;
      config.responseAbi = abis.responseAbi;
      config.proofAbi = abis.proofAbi;
      mkdirSync(outPath, { recursive: true });
      writeFileSync(
        `${outPath}/${typeName}.json`,
        JSON.stringify(config, null, 2),
      );

      let response = abis.responseAbi;

      mkdirSync(abiOutPath, { recursive: true });

      writeFileSync(
        `${abiOutPath}/${typeName}.json`,
        JSON.stringify(response, null, 2),
      );
    }
  });
}

/**
 * Generates ABI attestation type configurations in JSON format and stores them to outPath.
 * @param outPath output path for generated files
 * @param specific (optional) if specified as the attestation type name, only the ABI configuration for the specified type is generated
 */
export function generateDTOs(outPath: string = DTO_PATH): void {
  const astMap = getAttestationTypeASTs();

  astMap.forEach((ast, typeName) => {
    const config = getConfigForAST(ast);

    const dto = getDTOsForName(typeName, config);

    let targetFile = join(outPath, `${typeName}.dto.ts`);

    mkdirSync(outPath, { recursive: true });

    writeFileSync(targetFile, dto);
  });
}

export function generateVerifierServers(specificType?: string): void {
  const astMap = getAttestationTypeASTs();

  astMap.forEach((_, typeName) => {
    if (!specificType || (specificType && typeName === specificType)) {
      generateVerifierServer(typeName);
    }
  });
}

/**
 * Extracts the last part of a type name in the form of "struct A.B.C"
 * @param type
 * @returns
 */
function simpleType(type: string): string {
  return type.split('.').slice(-1)[0];
}

/**
 * Extracts JSON that describes structs defining attestation types. JSON is used to render
 * other autogenerated code or documentation.
 * @param ast
 * @returns
 */
function getConfigForAST(ast: SourceUnit): TypeRecord {
  let typeRec: TypeRecord | undefined;
  let count: number = 0;
  // whether we have encountered a consistency error
  let consistencyError = false;
  // Traverse AST for the only contract definition (interface)
  for (const contractDef of findAll('ContractDefinition', ast)) {
    if (count > 0) {
      throw new Error('Only one interface per file is supported');
    }
    // Extract from interface comment
    if (!contractDef.documentation?.text) {
      logError(`No documentation for interface ${contractDef.name}`);
    }
    const docs = contractDef.documentation?.text;
    const description = docs?.match(/ *\@notice *([^\@]*)/)?.[1] || '';
    const name = docs?.match(/ *\@custom\:name *([^\@]*)/)?.[1] || '';
    const verification =
      docs?.match(/ *\@custom\:verification *([^\@]*)/)?.[1] || '';
    const lut = docs?.match(/ *\@custom\:lut *([^\@]*)/)?.[1] || '';
    const supported = docs?.match(/ *\@custom\:supported *([^\@]*)/)?.[1] || '';
    const structs: StructRecord[] = [];
    // Extract and process structs comments
    contractDef.nodes.forEach((node) => {
      if (node.nodeType !== 'StructDefinition') {
        return;
      }
      const structDef = node as StructDefinition;
      if (!structDef.documentation?.text) {
        logError(
          `No documentation for struct ${contractDef.name}.${structDef.name}`,
        );
      }
      // Extract from struct comment
      const subDocs = structDef.documentation?.text;
      const description = subDocs?.match(/ *\@notice *([^\@]*)/)?.[1] || '';
      const above = subDocs?.match(/ *\@custom\:above *([^\@]*)/)?.[1] || '';
      const below = subDocs?.match(/ *\@custom\:below *([^\@]*)/)?.[1] || '';
      const params: ParamRecord[] =
        subDocs
          ?.match(/ *\@param *([^ ]+) *([^\@]*)/g)
          ?.map((line) => line.trim())
          .map((line) => {
            const match = line.match(/ *\@param *([^ ]+) (.*)/);
            if (!match) {
              throw new Error(`Could not parse line ${line}`);
            }
            const name = match[1];
            const param = structDef.members.find(
              (member) => member.name === name,
            );
            if (!param) {
              logError(
                `Could not find param '${name}' in struct '${structDef.name}'`,
              );
              consistencyError = true;
            }
            return {
              name: name.trim(),
              type: param!.typeDescriptions.typeString!.trim(),
              typeSimple: simpleType(
                param!.typeDescriptions.typeString!.trim(),
              ),
              comment: match[2].trim(),
            } as ParamRecord;
          }) || [];

      // Assert all params match the struct members
      if (params.length !== structDef.members.length) {
        for (const member of structDef.members) {
          if (!params.find((param) => param.name === member.name)) {
            logError(
              `Param '${member.name}' missing the '@param' comment in struct '${structDef.name}'`,
            );
            consistencyError = true;
          }
        }
        for (const param of params) {
          if (!structDef.members.find((member) => member.name === param.name)) {
            logError(
              `Param '${param.name}' has no corresponding member in struct '${structDef.name}'`,
            );
            consistencyError = true;
          }
        }
      }
      const structRec = {
        name: structDef.name.trim(),
        description: description.trim(),
        above: above.trim(),
        below: below.trim(),
        fullComment: subDocs,
        params,
      } as StructRecord;
      structs.push(structRec);
    });

    const foundRequiredStructs = new Set<string>();
    let requestBody!: StructRecord;
    let responseBody!: StructRecord;
    let request!: StructRecord;
    let response!: StructRecord;
    let proof!: StructRecord;
    const requestStructs: StructRecord[] = [];
    const responseStructs: StructRecord[] = [];
    let isRequestStruct = false;
    let isResponseStruct = false;
    // This works correctly only if the following ordering convention is used.
    // - first RequestBody struct appears
    // - then later ResponseBody struct appears
    // - all structs after RequestBody are request structs
    // - all structs after ResponseBody are response structs
    // - Proof struct may appear anywhere
    for (const struct of structs) {
      if (struct.name === 'Request') {
        foundRequiredStructs.add('Request');
        request = struct;
        continue;
      }
      if (struct.name === 'Response') {
        foundRequiredStructs.add('Response');
        response = struct;
        continue;
      }
      if (struct.name === 'Proof') {
        foundRequiredStructs.add('Proof');
        proof = struct;
        continue;
      }
      if (struct.name === 'RequestBody') {
        foundRequiredStructs.add('RequestBody');
        requestBody = struct;
        isRequestStruct = true;
        isResponseStruct = false;
        continue;
      }
      if (struct.name === 'ResponseBody') {
        foundRequiredStructs.add('ResponseBody');
        responseBody = struct;
        isRequestStruct = false;
        isResponseStruct = true;
        continue;
      }
      if (isRequestStruct) {
        requestStructs.push(struct);
        continue;
      }
      if (isResponseStruct) {
        responseStructs.push(struct);
        continue;
      }
    }
    const requiredStructs = [
      'Request',
      'Response',
      'Proof',
      'RequestBody',
      'ResponseBody',
    ];
    let isMissingStruct = false;
    for (const structName of requiredStructs) {
      if (!foundRequiredStructs.has(structName)) {
        logError(
          `Missing struct '${structName}' in interface ${contractDef.name}`,
        );
        isMissingStruct = true;
      }
    }
    if (isMissingStruct || consistencyError) {
      process.exit(1);
    }

    typeRec = {
      name: name.trim(),
      fullComment: docs,
      description: description.trim(),
      verification: verification,
      lut: lut.trim(),
      proof,
      request,
      response,
      requestBody,
      responseBody,
      requestStructs,
      responseStructs,
    } as TypeRecord;
    count++;
  }
  if (typeRec === undefined) {
    throw new Error('No interface found');
  }
  return typeRec;
}

////////////////////////////////////////////////////////////////////////
/// Auxiliary functions for generating code
////////////////////////////////////////////////////////////////////////

export function JSDocCommentText(text: string) {
  return (
    '/**\n' +
    text
      .trim()
      .split('\n')
      .map((line) => `* ${line}`)
      .join('\n') +
    '\n*/'
  );
}

export function commentText(text: string, prefix = '//') {
  if (prefix !== '') prefix += ' '; // add separator
  return text
    .trim()
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}
