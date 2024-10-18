import { Options } from 'prettier';
import {
  ParamRecord,
  StructRecord,
  TypeRecord,
} from '../../external-libs/config-types';
import { encodeAttestationName } from '../../external-libs/utils';
import { JSDocCommentText } from '../generate-utils';
import { attestationResponseStatusEnum } from './verifier-template/constants';

export const NEST_JS_DTO_PATH = 'generated/types/nest-js-dto';
export const PRETTIER_SETTINGS_NEST_JS_DTO: Options = {
  trailingComma: 'all',
  tabWidth: 4,
  printWidth: 160,
  semi: true,
  singleQuote: false,
  parser: 'typescript',
};

function solidityToDTOTypeInitialized(
  typeName: string,
  attestationTypeName: string,
  initialize = false,
): string {
  let match = typeName.match(/^.+(\[\d*\])$/);

  if (match) {
    const brackets = match[1];
    return (
      solidityToDTOTypeInitialized(
        typeName.slice(0, -brackets.length),
        attestationTypeName,
        false,
      ) +
      '[]' +
      (initialize ? '=[]' : '')
    );
  }
  if (typeName.match(/^u?int\d+$/)) {
    return 'string' + (initialize ? '=0;' : '');
  }
  if (typeName.match(/^bool$/)) {
    return 'boolean' + (initialize ? '=false;' : '');
  }
  if (typeName.match(/^bytes\d*$/)) {
    return 'string' + (initialize ? '="";' : '');
  }
  if (typeName.match(/^address$/)) {
    return 'string' + (initialize ? '="";' : '');
  }
  if (typeName.match(/^string$/)) {
    return 'string' + (initialize ? '="";' : '');
  }
  if (typeName.match(/^byte$/)) {
    return 'string' + (initialize ? '="";' : '');
  }
  match = typeName.match(/^struct ([\w\.]+)$/);
  if (match) {
    const name = match[1];
    return attestationTypeName + '_' + name.split('.').slice(-1)[0];
  }

  // if (typeName.match(/^\w+$/)) {
  //    return typeName;
  // }
  throw new Error(`Unknown type ${typeName}`);
}

function validationAnnotation(
  typeName: string,
  typeNameSimple: string,
  attestationTypeName: string,
  isArray = false,
): string {
  const arrayOpts = isArray ? '{each: true}' : '';
  const arrayOptsComma = isArray ? ', {each: true}' : '';
  if (typeName.match(/^u?int\d+$/)) {
    return `@Validate(IsUnsignedIntLike${arrayOptsComma})`;
  }
  if (typeName.match(/^int\d+$/)) {
    return `@Validate(IsSignedIntLike${arrayOptsComma})`;
  }
  if (typeName.match(/^bool$/)) {
    return `@IsBoolean(${arrayOpts})`;
  }
  if (typeName.match(/^bytes32$/)) {
    return `@Validate(IsHash32${arrayOptsComma})`;
  }
  if (typeName.match(/^bytes\d*$/)) {
    return `@Validate(Is0xHex${arrayOptsComma})`;
  }
  if (typeName.match(/^address$/)) {
    return `@Validate(IsEVMAddress${arrayOptsComma})`;
  }
  if (typeName.match(/^string$/)) {
    return `@IsString(${arrayOpts})`;
  }
  if (typeName.match(/^byte$/)) {
    return `@Validate(Is0xHex${arrayOptsComma})`;
  }
  if (typeName.startsWith('struct ')) {
    const isEmptyObject = isArray ? '' : '\n@IsNotEmptyObject()';
    return `@ValidateNested(${arrayOpts})
        @Type(() => ${attestationTypeName}_${typeNameSimple})
        @IsDefined(${arrayOpts})${isEmptyObject}
   @IsObject(${arrayOpts})   
  `;
  }

  throw new Error(`Unknown type ${typeName}`);
}

function exampleFor(
  typeName: string,
  typeNameSimple: string,
  isArray = false,
): string {
  const left = isArray ? '[' : '';
  const right = isArray ? ']' : '';
  if (typeName.match(/^uint\d+$/)) {
    return `${left}"123"${right}`;
  }
  if (typeName.match(/^int\d+$/)) {
    return `${left}"123"${right}`;
  }
  if (typeName.match(/^bool$/)) {
    return `${left}true${right}`;
  }
  if (typeName.match(/^bytes32$/)) {
    return `${left}"0x0000000000000000000000000000000000000000000000000000000000000000"${right}`;
  }
  if (typeName.match(/^bytes\d*$/)) {
    return `${left}"0x1234abcd"${right}`;
  }
  if (typeName.match(/^address$/)) {
    return `${left}"0x5d4BEB38B6b71aaF6e30D0F9FeB6e21a7Ac40b3a"${right}`;
  }
  if (typeName.match(/^string$/)) {
    return `${left}"Example string"${right}`;
  }
  if (typeName.match(/^byte$/)) {
    return `${left}"0x12"${right}`;
  }
  if (typeName.startsWith('struct ')) {
    return '';
  }
  throw new Error(`Unknown type '${typeName}'${right}`);
}

function commentsAndAnnotations(
  paramRec: ParamRecord,
  attestationTypeName: string,
): string {
  const typeName = paramRec.type;
  const typeNameSimple = paramRec.typeSimple!;
  const comment = JSDocCommentText(paramRec.comment) ?? '';
  const description = paramRec.comment.replace(/\`/g, "'");

  // Arrays
  const match = typeName.match(/^(.+)(\[\d*\])$/);
  if (match) {
    const match2 = typeNameSimple.match(/^(.+)(\[\d*\])$/);
    if (!match2) {
      throw new Error(
        `Unexpected type name '${typeNameSimple}' for '${typeName}'.`,
      );
    }
    const apiPropertyAnnotation = typeName.startsWith('struct ')
      ? `@ApiProperty({description: \`${description}\`})`
      : `@ApiProperty({description: \`${description}\`, example: ${exampleFor(match[1], match2[1], true)}})`;
    return `
      ${comment}
      ${validationAnnotation(match[1], match2[1], attestationTypeName, true)}
      ${apiPropertyAnnotation}`;
  }
  if (typeName.match(/^uint\d+$/)) {
    return `
      ${comment}
      ${validationAnnotation(typeName, typeNameSimple, attestationTypeName)}
      @ApiProperty({description: \`${description}\`, example: ${exampleFor(typeName, typeNameSimple)}})`;
  }
  if (typeName.match(/^int\d+$/)) {
    return `
      ${comment}
      ${validationAnnotation(typeName, typeNameSimple, attestationTypeName)}
      @ApiProperty({description: \`${description}\`, example: ${exampleFor(typeName, typeNameSimple)}})`;
  }
  if (typeName.match(/^bool$/)) {
    return `
      ${comment}
      ${validationAnnotation(typeName, typeNameSimple, attestationTypeName)}
      @ApiProperty({description: \`${description}\`, example: ${exampleFor(typeName, typeNameSimple)}})`;
  }
  if (typeName.match(/^bytes32$/)) {
    let example = '';
    if (paramRec.name === 'attestationType') {
      example = `"${encodeAttestationName(attestationTypeName)}"`;
    } else if (paramRec.name === 'sourceId') {
      example = `"${encodeAttestationName('BTC')}"`;
    } else {
      example = exampleFor(typeName, typeNameSimple);
    }

    return `
      ${comment}
      ${validationAnnotation(typeName, typeNameSimple, attestationTypeName)}
      @ApiProperty({description: \`${description}\`, example: ${example}})`;
  }

  if (typeName.match(/^bytes\d*$/)) {
    return `
      ${comment}
      ${validationAnnotation(typeName, typeNameSimple, attestationTypeName)}
      @ApiProperty({description: \`${description}\`, example: ${exampleFor(typeName, typeNameSimple)}})`;
  }
  if (typeName.match(/^address$/)) {
    return `
      ${comment}
      ${validationAnnotation(typeName, typeNameSimple, attestationTypeName)}
      @ApiProperty({description: \`${description}\`, example: ${exampleFor(typeName, typeNameSimple)}})`;
  }
  if (typeName.match(/^string$/)) {
    return `
      ${comment}
      @ApiProperty({description: \`${description}\`, example: ${exampleFor(typeName, typeNameSimple)}})`;
  }
  if (typeName.match(/^byte$/)) {
    return `
      ${comment}
      ${validationAnnotation(typeName, typeNameSimple, attestationTypeName)}
      @ApiProperty({description: \`${description}\`, example: ${exampleFor(typeName, typeNameSimple)}})`;
  }
  if (typeName.startsWith('struct ')) {
    return `
   ${comment}
   ${validationAnnotation(typeName, typeNameSimple, attestationTypeName)}
   @ApiProperty({description: \`${description}\`})`;
  }
  throw new Error(`Unknown type '${typeName}'`);
}

function paramFormat(param: ParamRecord, attestationTypeName: string) {
  let content = `${commentsAndAnnotations(param, attestationTypeName)}\n`;
  content += `${param.name}: ${solidityToDTOTypeInitialized(param.type, attestationTypeName)};`;
  return content;
}

function structType(
  structRec: StructRecord,
  attestationTypeName: string,
): string {
  return (
    '' +
    `export class ${attestationTypeName}_${structRec.name} {
         constructor(params: Required<${attestationTypeName}_${structRec.name}>) {
            Object.assign(this, params);
          }         
   ${structRec.params.map((param) => paramFormat(param, attestationTypeName)).join('\n')}
}`
  );
}

const autoGenerateCodeNotice = `
//////////////////////////////////////////////////////////////////////////////////////////
/////// THIS CODE IS AUTOGENERATED. DO NOT CHANGE!!!                             /////////
//////////////////////////////////////////////////////////////////////////////////////////
`;
const unsignedAndSignedIntValidators = `
/**
 * Validator constraint if the given value is a number or 0x-prefixed hexadecimal string.
 */
@ValidatorConstraint({ name: "unsigned-int", async: false })
class IsUnsignedIntLike implements ValidatorConstraintInterface {
  /**
   * Validates if the given value is a string of decimal unsigned number or 0x-prefixed hexadecimal string.
   * @param text
   * @param args
   * @returns
   */
  validate(text: any, _args: ValidationArguments) {
    return typeof text === "string" && (/^0x[0-9a-fA-F]+$/i.test(text) || /^[0-9]+$/i.test(text));
  }

  /**
   * Returns the default error message template.
   * @param args
   * @returns
   */
  defaultMessage(_args: ValidationArguments) {
    return "($property) value ($value) is not a decimal number in string or 0x-prefixed hexadecimal string";
  }
}

/**
 * Validator constraint if the given value is a number or 0x-prefixed hexadecimal string.
 */
@ValidatorConstraint({ name: "signed-int", async: false })
class IsSignedIntLike implements ValidatorConstraintInterface {
  /**
   * Validates if the given value is a number or 0x-prefixed hexadecimal string.
   * @param text
   * @param args
   * @returns
   */
  validate(text: any, _args: ValidationArguments) {
    return typeof text === "string" && (/^\-?0x[0-9a-fA-F]+$/i.test(text) || /^\-?[0-9]+$/i.test(text));
  }

  /**
   * Returns the default error message template.
   * @param args
   * @returns
   */
  defaultMessage(_args: ValidationArguments) {
    return "($property) value ($value) is not a signed decimal integer in string or signed 0x-prefixed hexadecimal string";
  }
}`;

const isHash32Validator = `
/**
 * Validator constraint if the given value is a 0x-prefixed hexadecimal string representing 32 bytes.
 */
@ValidatorConstraint({ name: "hash-32", async: false })
class IsHash32 implements ValidatorConstraintInterface {
  /**
   * Validates if the given value is a 0x-prefixed hexadecimal string representing 32 bytes.
   * @param text
   * @param args
   * @returns
   */
  validate(text: any, _args: ValidationArguments) {
    return typeof text === "string" && /^0x[0-9a-f]{64}$/i.test(text);
  }

  /**
   * Returns the default error message template.
   * @param args
   * @returns
   */
  defaultMessage(_args: ValidationArguments) {
    return "($property) value ($value) is not 0x-prefixed hexadecimal string representing 32 bytes";
  }
}
`;

const is0xHex = `
/**
 * Validator constraint if the given value is a 0x-prefixed hexadecimal string
 */
@ValidatorConstraint({ name: "hash-0x", async: false })
class Is0xHex implements ValidatorConstraintInterface {
  /**
   * Validates if the given value is a 0x-prefixed hexadecimal string 
   * @param text
   * @param args
   * @returns
   */
  validate(text: any, _args: ValidationArguments) {
    return typeof text === "string" && /^0x[0-9a-f]+$/i.test(text);
  }

  /**
   * Returns the default error message template.
   * @param args
   * @returns
   */
  defaultMessage(_args: ValidationArguments) {
    return "($property) value ($value) is not 0x-prefixed hexadecimal string";
  }
}
`;

const isEVMAddressValidator = `
/**
 * Validator constraint if the given value is an EVM address, hence 0x-prefixed hexadecimal string representing 20 bytes.
 */
@ValidatorConstraint({ name: "evm-address", async: false })
class IsEVMAddress implements ValidatorConstraintInterface {
  /**
   * Validates if the given value is an EVM address, hence 0x-prefixed hexadecimal string representing 20 bytes.
   * @param text
   * @param args
   * @returns
   */
  validate(text: any, _args: ValidationArguments) {
    return typeof text === "string" && /^0x[0-9a-f]{40}$/i.test(text);
  }

  /**
   * Returns the default error message template.
   * @param args
   * @returns
   */
  defaultMessage(_args: ValidationArguments) {
    return "($property) value ($value) is not 0x-prefixed hexadecimal string representing 20 bytes (EVM address)";
  }
}
`;

function attestationResponseDTOSpecific(name: string) {
  return `
  /**
  * Attestation response for specific attestation type (flattened)
  */
  export class AttestationResponseDTO_${name}_Response {
    constructor(params: Required<AttestationResponseDTO_${name}_Response>) {
        Object.assign(this, params);
    }

    status: AttestationResponseStatus;

    response?: ${name}_Response;
  }
  `;
}

export function getDTOsForName(name: string, typeRec: TypeRecord): string {
  const reversedRequestStructs = [...typeRec.requestStructs].reverse();
  const reversedResponseStructs = [...typeRec.responseStructs].reverse();
  return (
    autoGenerateCodeNotice +
    `import { ApiProperty, OmitType } from "@nestjs/swagger";
      import { Type } from "class-transformer";
      import { Validate, IsBoolean, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface, IsDefined, IsNotEmptyObject, IsObject, ValidateNested } from "class-validator";

      

///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// CUSTOM VALIDATORS ////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

${unsignedAndSignedIntValidators}
${isHash32Validator}
${is0xHex}
${isEVMAddressValidator}

///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// DTOs /////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////
${attestationResponseStatusEnum}
${attestationResponseDTOSpecific(name)}
${reversedRequestStructs.map((struct) => structType(struct, name)).join('\n')}
${reversedResponseStructs.map((struct) => structType(struct, name)).join('\n')}
${structType(typeRec.responseBody, name)}
${structType(typeRec.requestBody, name)}
${structType(typeRec.request, name)}
${structType(typeRec.response, name)}
${structType(typeRec.proof, name)}

export class ${name}_RequestNoMic extends OmitType<${name}_Request, "messageIntegrityCode">(${name}_Request, ['messageIntegrityCode'] as const) {}

`
  );
}
