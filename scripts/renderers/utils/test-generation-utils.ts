import { StructRecord, TypeRecord } from '../../../external-libs/config-types';

export function randomStruct(
  structRec: StructRecord,
  structMap: Map<string, StructRecord>,
  seed = '0',
  fullRandomCode = false,
): string {
  let content = '{\n';
  let cnt = 0;
  for (const param of structRec.params) {
    const match = param.typeSimple!.match(/^.+(\[(\d*)\])$/);
    if (match) {
      const brackets = match[1];
      const value = parseInt(match[2]);
      const typeOfArray = param.typeSimple!.slice(0, -brackets.length);
      const match2 = typeOfArray.match(/^.+(\[(\d*)\])$/);
      if (match2) {
        throw new Error('Nested arrays not supported');
      }
      const arrayStruct = structMap.get(typeOfArray);
      const length = isNaN(value) || value === 0 ? 3 : value; // fixed length up to 3
      if (arrayStruct) {
        content +=
          `${param.name}: [` +
          Array(length)
            .fill(0)
            .map(() => randomStruct(arrayStruct, structMap, seed))
            .join(', ') +
          ']';
      } else {
        content +=
          `${param.name}: [` +
          Array(length)
            .fill(0)
            .map(
              () =>
                `randSol("${typeOfArray}", "${seed}"${fullRandomCode ? `+ (fullRandom ? Math.random().toString() : "")` : ''})`,
            )
            .join(', ') +
          ']';
      }
    } else {
      const directStruct = structMap.get(param.typeSimple!);
      if (directStruct) {
        content += `${param.name}: ${randomStruct(directStruct, structMap, seed)}`;
      } else {
        content += `${param.name}: randSol("${param.type}", "${seed}"${fullRandomCode ? `+ (fullRandom ? Math.random().toString() : "")` : ''})`;
      }
    }
    if (cnt < structRec.params.length - 1) {
      content += ',\n';
    } else {
      content += '\n';
    }
    cnt++;
  }
  content += '}';
  return content;
}
export function structMap(typeRec: TypeRecord): Map<string, StructRecord> {
  const map = new Map<string, StructRecord>();
  for (const struct of typeRec.requestStructs) {
    map.set(struct.name, struct);
  }
  for (const struct of typeRec.responseStructs) {
    map.set(struct.name, struct);
  }
  return map;
}
