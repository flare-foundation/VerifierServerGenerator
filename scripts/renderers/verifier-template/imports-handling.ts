import { ImportBlock, ImportStatement } from "./interfaces";

export function extractImports(fileContent: string): ImportBlock {
    // Capture groups:
    // $1 = default import name (can be non-existent)
    // $2 = destructured exports (can be non-existent)
    // $3 = wildcard import name (can be non-existent)
    // $4 = module identifier
    const importRegex =
        /import(?:(?:(?:[ \n\t]+([^ *\n\t\{\},]+)[ \n\t]*(?:,|[ \n\t]+))?([ \n\t]*\{(?:[ \n\t]*[^ \n\t"'\{\}]+[ \n\t]*,?)+\})?[ \n\t]*)|[ \n\t]*\*[ \n\t]*as[ \n\t]+([^ \n\t\{\}]+)[ \n\t]+)from[ \n\t]*(?:['"])([^'"\n]+)(['"])/g;
    const imports = fileContent.matchAll(importRegex);
    if (!imports) {
        return {
            startIndex: -1,
            endIndex: -1,
            imports: [],
        };
    }
    const matches = [...imports];
    const result: ImportStatement[] = [];
    for (const match of matches) {
        const defaultImport = (match[1] ?? "").trim() === "" ? undefined : match[1].trim();
        const destructuredExports =
            (match[2] ?? "").trim() === ""
                ? []
                : match[2]
                      .trim()
                      .replace(/[\{\}]/g, "")
                      .split(",")
                      .map((s) => s.trim());

        const wildcardImports = (match[3] ?? "").trim() === "" ? undefined : match[3].trim();

        const moduleIdentifier = match[4].trim().replace(/['"]/g, "");
        const importStatement: ImportStatement = {
            defaultImport,
            destructuredExports,
            wildcardImports,
            moduleIdentifier,
        };
        result.push(importStatement);
    }

    return {
        startIndex: matches && matches.length > 0 ? matches[0].index! : -1,
        endIndex: matches && matches.length > 0 ? matches[matches.length - 1].index! + matches[matches.length - 1][0].length : -1,
        imports: result,
    };
}
export function renderImports(extractedImports: ImportStatement[]) {
    return extractedImports
        .map((importStatement) => {
            let result = `import `;
            if (importStatement.defaultImport) {
                result += `${importStatement.defaultImport} `;
            }
            if (importStatement.destructuredExports.length > 0) {
                if (importStatement.defaultImport) {
                    result += `, `;
                }
                result += `{ ${importStatement.destructuredExports.join(", ")} } `;
            }
            if (importStatement.wildcardImports) {
                result += `* as ${importStatement.wildcardImports} `;
            }
            result += `from '${importStatement.moduleIdentifier}';`;
            return result;
        })
        .join("\n");
}
export function mergeImports(extractedImports: ImportStatement[]) {
    const exportMap = new Map<string, ImportStatement>();
    extractedImports.forEach((importStatement) => {
        const tmp = exportMap.get(importStatement.moduleIdentifier);
        if (tmp) {
            if (importStatement.defaultImport) {
                if (tmp.defaultImport && tmp.defaultImport !== importStatement.defaultImport) {
                    throw new Error(
                        `Different default imports for module ${importStatement.moduleIdentifier}: ${tmp.defaultImport} and ${importStatement.defaultImport}`,
                    );
                }
                tmp.defaultImport = importStatement.defaultImport;
            }
            if (importStatement.wildcardImports) {
                if (tmp.wildcardImports && tmp.wildcardImports !== importStatement.wildcardImports) {
                    throw new Error(
                        `Different wildcard imports for module ${importStatement.moduleIdentifier}: ${tmp.wildcardImports} and ${importStatement.wildcardImports}`,
                    );
                }
                tmp.wildcardImports = importStatement.wildcardImports;
            }
            if (importStatement.destructuredExports.length > 0) {
                for (const exportName of importStatement.destructuredExports) {
                    if (exportName.trim() === "") continue;
                    if (tmp.destructuredExports.includes(exportName)) {
                        continue;
                    }
                    tmp.destructuredExports.push(exportName);
                }
                tmp.destructuredExports.sort();
            }
        } else {
            exportMap.set(importStatement.moduleIdentifier, {
                defaultImport: importStatement.defaultImport,
                destructuredExports: [...importStatement.destructuredExports.filter((x) => x.trim() !== "")],
                wildcardImports: importStatement.wildcardImports,
                moduleIdentifier: importStatement.moduleIdentifier,
            });
        }
    });
    const result = Array.from(exportMap.values());
    result.sort((a, b) => {
        const match1 = a.moduleIdentifier.match(/^[\.\/]+/);
        const match2 = b.moduleIdentifier.match(/^[\.\/]+/);
        if ((match1 && match2) || (!match1 && !match2)) {
            return a.moduleIdentifier.localeCompare(b.moduleIdentifier);
        }
        if (match1) {
            return 1;
        }
        return -1;
    });
    result.forEach((importStatement) => {
        importStatement.destructuredExports.sort();
    });
    return result;
}
