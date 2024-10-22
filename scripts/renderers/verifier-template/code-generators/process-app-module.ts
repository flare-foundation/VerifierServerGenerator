import { readFileSync, writeFileSync } from 'fs-extra';
import * as path from 'path';
import prettier from 'prettier';
import { PRETTIER_SETTINGS_VERIFIER_CODE } from '../constants';
import {
  VerifierCodeGenerationOptions,
  defaultVerifierCodeGenerationOptions,
} from '../interfaces';
import { toKebabCase, prefixDotSlash } from '../utils';
import {
  extractImports,
  mergeImports,
  renderImports,
} from '../imports-handling';
import { join } from 'path';

interface ArrayContent {
  entries: string[];
  startIndex: number;
  endIndex: number;
}

export function firstLevelArrayExtract(startRegex: RegExp, content: string) {
  const match = content.match(startRegex);
  if (!match) {
    throw new Error(
      `Could not find array start in ${content?.slice(0, 100) + '...'}`,
    );
  }
  const stack: string[] = [];

  function isOpeningBracket(c: string) {
    return c === '[' || c === '{' || c === '(';
  }
  function isClosingBracket(c: string) {
    return c === ']' || c === '}' || c === ')';
  }
  function isMatchingBracket(opening: string, closing: string) {
    return (
      (opening === '[' && closing === ']') ||
      (opening === '{' && closing === '}') ||
      (opening === '(' && closing === ')')
    );
  }

  const firstLevelEntries: string[] = [];
  let startIndexFirstLevelObject = -1;
  let startIndex = -1;

  for (let i = match!.index!; i < content.length; i++) {
    const c = content[i];
    if (stack.length === 0 && c !== '[') continue;

    if (isOpeningBracket(c)) {
      if (stack.length === 0) {
        if (c !== '[') {
          throw new Error(`Expected '[' but got ${c}`);
        }
        startIndex = i;
        startIndexFirstLevelObject = i + 1;
      }
      if (c === '{' && stack.length === 1) {
        const part = content.slice(startIndexFirstLevelObject, i).trim();
        // can be just comma
        if (part.length > 1) {
          // non-object class names
          firstLevelEntries.push(
            ...part
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s !== ''),
          );
        }
        startIndexFirstLevelObject = i;
      }
      stack.push(c);
    } else if (isClosingBracket(c)) {
      const last = stack[stack.length - 1];
      if (isMatchingBracket(last, c)) {
        if (stack.length === 2) {
          if (c !== '}') {
            throw new Error(`Expected '}' but got ${c}`);
          }
          // include full object string
          firstLevelEntries.push(
            content.slice(startIndexFirstLevelObject, i + 1),
          );
          // continue from next char
          startIndexFirstLevelObject = i + 1;
        }
        stack.pop();
        // End of array
        if (stack.length === 0) {
          const endIndex = i;
          const part = content.slice(startIndexFirstLevelObject, i).trim();
          // can be just comma
          if (part.length > 1) {
            // non-object class names
            firstLevelEntries.push(
              ...part
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s !== ''),
            );
          }
          return {
            entries: firstLevelEntries,
            startIndex,
            endIndex,
          } as ArrayContent;
        }
      } else {
        throw new Error(
          `Bracket mismatch ${last} ${c} in ${content.slice(i - 100, i + 100)}`,
        );
      }
    }
  }
  throw new Error(
    `Could not find array end in ${content?.slice(0, 100) + '...'}`,
  );
}

export function replaceInContent(content: string, arrayContent: ArrayContent) {
  return (
    content.slice(0, arrayContent.startIndex) +
    '[' +
    arrayContent.entries.join(', ') +
    ']' +
    content.slice(arrayContent.endIndex + 1)
  );
}

export async function processAppModuleFile(
  _options: VerifierCodeGenerationOptions,
  attestationTypeName: string,
  dataSource: string,
  clearAll = false,
) {
  const options = { ...defaultVerifierCodeGenerationOptions, ..._options };
  const filePath = join(options.repoPath, options.appModuleRelativePath);
  let content = readFileSync(filePath, 'utf8');

  const relControllerPath = prefixDotSlash(
    path.relative(
      path.dirname(options.appModuleRelativePath),
      options.controllersRelPath,
    ),
  );
  const relServicesPath = prefixDotSlash(
    path.relative(
      path.dirname(options.appModuleRelativePath),
      options.servicesRelPath,
    ),
  );

  const extractedImportObjects = extractImports(content);
  const controllerIdentifier = `${relControllerPath}/${dataSource.toLowerCase() + '/' + dataSource.toLowerCase() + '-'}${toKebabCase(
    attestationTypeName,
  )}-verifier.controller`;
  const serviceIdentifier = `${relServicesPath}/${dataSource.toLowerCase() + '/' + dataSource.toLowerCase() + '-'}${toKebabCase(
    attestationTypeName,
  )}-verifier.service`;

  const standardImportObjects = extractImports(`
    import { ${dataSource}${attestationTypeName}VerifierController } from "${controllerIdentifier}";
    import { ${dataSource}${attestationTypeName}VerifierService } from "${serviceIdentifier}";
    `);
  const mergedImportObjects = mergeImports([
    ...standardImportObjects.imports,
    ...extractedImportObjects.imports,
  ]).filter(
    (x) =>
      !clearAll ||
      (x.moduleIdentifier !== controllerIdentifier &&
        x.moduleIdentifier !== serviceIdentifier),
  );
  const mergedImports = renderImports(mergedImportObjects);

  content =
    content.slice(0, extractedImportObjects.startIndex) +
    mergedImports +
    content.slice(extractedImportObjects.endIndex);

  const controllerMatches = firstLevelArrayExtract(
    /controllers[\s\n]*\:[\s\n]*\[/,
    content,
  );
  controllerMatches.entries = controllerMatches.entries.filter(
    (s) => s !== `${dataSource ?? ''}${attestationTypeName}VerifierController`,
  );
  if (!options.clearAll) {
    controllerMatches.entries.push(
      `${dataSource ?? ''}${attestationTypeName}VerifierController`,
    );
  }
  content = replaceInContent(content, controllerMatches);

  const providersMatches = firstLevelArrayExtract(
    /providers[\s\n]*\:[\s\n]*\[/,
    content,
  );
  providersMatches.entries = providersMatches.entries.filter(
    (s) => s !== `${dataSource ?? ''}${attestationTypeName}VerifierService`,
  );
  if (!options.clearAll) {
    providersMatches.entries.push(
      `${dataSource ?? ''}${attestationTypeName}VerifierService`,
    );
  }
  content = replaceInContent(content, providersMatches);

  const prettyContent = await prettier.format(
    content,
    PRETTIER_SETTINGS_VERIFIER_CODE,
  );
  writeFileSync(filePath, prettyContent);
}
