import { mkdirSync, writeFileSync } from 'fs';
import prettier, { Options } from 'prettier';
import {
  ParamRecord,
  StructRecord,
  TypeRecord,
} from '../../external-libs/config-types';
import { encodeAttestationName } from '../../external-libs/utils';
import { TS_TYPES_PATH } from '../constants';
import { JSDocCommentText, getTypeConfigMap } from '../generate-utils';

export const PRETTIER_SETTINGS_TS: Options = {
  trailingComma: 'all',
  tabWidth: 4,
  printWidth: 160,
  semi: true,
  singleQuote: false,
  parser: 'typescript',
};

function solidityToTSType(typeName: string): string {
  let match = typeName.match(/^.+(\[\d*\])$/);
  if (match) {
    const brackets = match[1];
    return (
      '(' + solidityToTSType(typeName.slice(0, -brackets.length)) + ')' + '[]'
    );
  }
  if (typeName.match(/^u?int\d+$/)) {
    return 'string';
  }
  if (typeName.match(/^bool$/)) {
    return 'boolean';
  }
  if (typeName.match(/^bytes\d*$/)) {
    return 'string';
  }
  if (typeName.match(/^address$/)) {
    return 'string';
  }
  if (typeName.match(/^string$/)) {
    return 'string';
  }
  if (typeName.match(/^byte$/)) {
    return 'string';
  }
  match = typeName.match(/^struct ([\w\.]+)$/);
  if (match) {
    const name = match[1];
    return name.split('.').slice(-1)[0];
  }
  if (typeName.match(/^\w+$/)) {
    return typeName;
  }
  throw new Error(`Unknown type ${typeName}`);
}

function paramFormat(param: ParamRecord) {
  return (
    '' +
    `${JSDocCommentText(param.comment)}
${param.name}: ${solidityToTSType(param.type)}
`
  );
}

function structType(structRec: StructRecord): string {
  return (
    '' +
    `${JSDocCommentText(structRec.description)}
      export interface ${structRec.name} {
   ${structRec.params.map((param) => paramFormat(param)).join('\n')}
}`
  );
}

function getTypesForName(name: string, typeRec: TypeRecord): string {
  return (
    '' +
    `export namespace ${name} {
export const NAME = "${name}";
export const TYPE = "${encodeAttestationName(name)}"

${structType(typeRec.request)}

${structType(typeRec.response)}

${structType(typeRec.proof)}

${structType(typeRec.requestBody)}

${typeRec.requestStructs.map((struct) => structType(struct)).join('\n')}

${structType(typeRec.responseBody)}

${typeRec.responseStructs.map((struct) => structType(struct)).join('\n')}

export type RequestNoMic = Omit<Request, "messageIntegrityCode">; 
}
`
  );
}

/**
 * Generates the TS code for the attestation type interfaces and data source definitions.
 * @param outPath
 * @param specific
 */
export async function generateTSTypes(
  outPath: string = TS_TYPES_PATH,
  specific?: string,
): Promise<void> {
  const typeMap = getTypeConfigMap();
  let indexContent = '';
  mkdirSync(outPath, { recursive: true });
  for (const [name, typeRec] of typeMap) {
    if (!specific || (specific && name === specific)) {
      const content = getTypesForName(name, typeRec);
      const prettyContent = await prettier.format(
        content,
        PRETTIER_SETTINGS_TS,
      );
      writeFileSync(`${outPath}/${name}.ts`, prettyContent);
    }
    indexContent += `export * from "./${name}";\n`;
  }
}
