import { existsSync, mkdirSync } from "fs-extra";

export function createDirIfNotExist(targetPath: string) {
    if (!existsSync(targetPath)) {
        mkdirSync(targetPath, { recursive: true });
    }
}

export function toKebabCase(str: string) {
    return str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (match, ofs) => (ofs ? "-" : "") + match.toLowerCase());
}

export function prefixDotSlash(relativePath: string) {
    if (relativePath.startsWith(".")) {
        return relativePath;
    }
    return `./${relativePath}`;
}
