import { promises as fs } from "node:fs";
import path from "node:path";
import prettier from "prettier";
import AdmZip from "adm-zip";

const root = process.cwd();
const args = process.argv.slice(2);

const BACKUP_DIR = path.join(root, ".fmt-backups");

const prettierExtensions = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".json",
    ".css",
    ".scss",
    ".html",
    ".md",
    ".yaml",
    ".yml",
]);

const defaultTargets = [
    "src",
    ".vscode",
    "package.json",
    "tsconfig.json",
    "astro.config.mjs",
    ".prettierrc",
];

// ── File collection ──────────────────────────────────────────────────────────

async function exists(target) {
    try {
        await fs.access(target);
        return true;
    } catch {
        return false;
    }
}

async function collectFiles(targetPath) {
    const stat = await fs.stat(targetPath);
    if (stat.isFile()) return [targetPath];

    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const files = await Promise.all(
        entries
            .filter((entry) => !entry.name.startsWith(".git"))
            .filter(
                (entry) =>
                    !["node_modules", "dist", ".astro"].includes(entry.name)
            )
            .map(async (entry) => {
                const nextPath = path.join(targetPath, entry.name);
                return entry.isDirectory()
                    ? collectFiles(nextPath)
                    : [nextPath];
            })
    );

    return files.flat();
}

// ── Tag formatting ───────────────────────────────────────────────────────────

function getIndent(source, index) {
    const lineStart = source.lastIndexOf("\n", index - 1) + 1;
    return source.slice(lineStart, index).match(/^[ \t]*/)?.[0] ?? "";
}

function normalizeAttribute(attr) {
    let result = "";
    let quote = "";
    let pendingSpace = false;

    for (let i = 0; i < attr.length; i += 1) {
        const char = attr[i];
        const previous = attr[i - 1];

        if (quote) {
            result += char;
            if (char === quote && previous !== "\\") quote = "";
            continue;
        }

        if (char === '"' || char === "'" || char === "`") {
            if (pendingSpace && result) result += " ";
            pendingSpace = false;
            quote = char;
            result += char;
            continue;
        }

        if (/\s/.test(char)) {
            pendingSpace = true;
            continue;
        }

        if (pendingSpace && result) result += " ";
        pendingSpace = false;
        result += char;
    }

    return result.trim();
}

function findTagEnd(source, start) {
    let quote = "";
    let braceDepth = 0;

    for (let i = start + 1; i < source.length; i += 1) {
        const char = source[i];
        const previous = source[i - 1];

        if (quote) {
            if (char === quote && previous !== "\\") quote = "";
            continue;
        }

        if (char === '"' || char === "'" || char === "`") {
            quote = char;
            continue;
        }

        if (char === "{") braceDepth += 1;
        if (char === "}") braceDepth -= 1;
        if (char === ">" && braceDepth === 0) return i;
    }

    return -1;
}

function splitAttributes(source) {
    const attrs = [];
    let quote = "";
    let braceDepth = 0;
    let parenDepth = 0;
    let squareDepth = 0;
    let start = null;

    for (let i = 0; i <= source.length; i += 1) {
        const char = source[i] ?? " ";
        const previous = source[i - 1];

        if (start === null && /\s/.test(char)) continue;
        if (start === null) start = i;

        if (quote) {
            if (char === quote && previous !== "\\") quote = "";
            continue;
        }

        if (char === '"' || char === "'" || char === "`") {
            quote = char;
            continue;
        }

        if (char === "{") braceDepth += 1;
        if (char === "}") braceDepth -= 1;
        if (char === "(") parenDepth += 1;
        if (char === ")") parenDepth -= 1;
        if (char === "[") squareDepth += 1;
        if (char === "]") squareDepth -= 1;

        const isTopLevel =
            braceDepth === 0 && parenDepth === 0 && squareDepth === 0;
        if ((/\s/.test(char) || i === source.length) && isTopLevel) {
            const attr = normalizeAttribute(source.slice(start, i));
            if (attr) attrs.push(attr);
            start = null;
        }
    }

    return attrs;
}

function isClientDirective(attr) {
    return attr.startsWith("client:");
}

function hasSingleProp(attrs) {
    return attrs.length === 1;
}

function isShortTag(tag) {
    return tag.length <= 60;
}

function hasMultipleProps(attrs) {
    return attrs.length > 1;
}

function formatOpeningTag(rawTag, indent) {
    const tagMatch = rawTag.match(/^<([A-Za-z][\w:.-]*)\s*([\s\S]*?)(\/?)>$/);
    if (!tagMatch) return rawTag;

    const [, tagName, rawAttrs, selfCloseMarker] = tagMatch;
    const attrs = splitAttributes(rawAttrs);
    const selfClosing = selfCloseMarker === "/";
    const closing = selfClosing ? " />" : ">";
    const inlineTag = `<${tagName}${attrs.length ? ` ${attrs.join(" ")}` : ""}${closing}`;

    if (attrs.length === 0) return inlineTag;
    if (isShortTag(inlineTag)) return inlineTag;
    if (hasSingleProp(attrs)) return inlineTag;

    if (hasMultipleProps(attrs)) {
        const clientAttrs = attrs.filter(isClientDirective);
        const regularAttrs = attrs.filter((attr) => !isClientDirective(attr));
        const firstLineAttrs = clientAttrs.length
            ? ` ${clientAttrs.join(" ")}`
            : "";
        const propIndent = `${indent}    `;
        const propLines = regularAttrs.map((attr) => `${propIndent}${attr}`);
        return [
            `<${tagName}${firstLineAttrs}`,
            ...propLines,
            `${indent}${closing.trim()}`,
        ].join("\n");
    }

    return inlineTag;
}

function formatTags(source) {
    let result = "";
    let cursor = 0;

    while (cursor < source.length) {
        const tagStart = source.indexOf("<", cursor);
        if (tagStart === -1) {
            result += source.slice(cursor);
            break;
        }

        result += source.slice(cursor, tagStart);

        const nextChar = source[tagStart + 1];
        if (!/[A-Za-z]/.test(nextChar)) {
            result += "<";
            cursor = tagStart + 1;
            continue;
        }

        const tagEnd = findTagEnd(source, tagStart);
        if (tagEnd === -1) {
            result += source.slice(tagStart);
            break;
        }

        const rawTag = source.slice(tagStart, tagEnd + 1);
        const indent = getIndent(source, tagStart);
        result += formatOpeningTag(rawTag, indent);
        cursor = tagEnd + 1;
    }

    return result;
}

// ── Format single file ───────────────────────────────────────────────────────

async function formatFile(filePath) {
    const ext = path.extname(filePath);
    const source = await fs.readFile(filePath, "utf8");
    let formatted = source;

    if (prettierExtensions.has(ext)) {
        const fileInfo = await prettier.getFileInfo(filePath, {
            ignorePath: path.join(root, ".prettierignore"),
        });
        if (!fileInfo.ignored) {
            const config = (await prettier.resolveConfig(filePath)) ?? {};
            formatted = await prettier.format(source, {
                ...config,
                filepath: filePath,
            });
        }
    }

    if (ext === ".astro" || ext === ".tsx" || ext === ".jsx") {
        formatted = formatTags(formatted);
    }

    if (formatted !== source) {
        await fs.writeFile(filePath, formatted, "utf8");
        return { status: "updated", original: source };
    }

    return { status: "unchanged", original: null };
}

// ── Backup ───────────────────────────────────────────────────────────────────

async function createBackup(entries) {
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    const now = new Date();
    const timestamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
    ].join("-");

    const zipName = `backup-${timestamp}.zip`;
    const zipPath = path.join(BACKUP_DIR, zipName);

    const zip = new AdmZip();
    for (const [relPath, content] of entries) {
        zip.addFile(relPath.replace(/\\/g, "/"), Buffer.from(content, "utf8"));
    }
    zip.writeZip(zipPath);

    console.log(
        `backup → .fmt-backups/${zipName}  (${entries.size} file(s))`
    );
}

// ── Restore ──────────────────────────────────────────────────────────────────

async function restoreBackup(target = "last") {
    let names;
    try {
        names = await fs.readdir(BACKUP_DIR);
    } catch {
        console.error("No backups found — .fmt-backups/ does not exist.");
        return;
    }

    const zips = names.filter((f) => f.endsWith(".zip")).sort();

    if (zips.length === 0) {
        console.error("No backup zips found in .fmt-backups/");
        return;
    }

    let zipName;
    if (target === "last" || target === "l") {
        zipName = zips[zips.length - 1];
    } else {
        zipName = zips.find((f) => f.includes(target));
        if (!zipName) {
            console.error(`Backup not found: "${target}"`);
            console.log("\nAvailable backups:");
            zips.forEach((z) => console.log(`  ${z}`));
            return;
        }
    }

    const zip = new AdmZip(path.join(BACKUP_DIR, zipName));
    zip.extractAllTo(root, /* overwrite */ true);

    const count = zip.getEntries().length;
    console.log(`restored ${count} file(s) from .fmt-backups/${zipName}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    // fmt backup [last | <name>]   or   fmt b [last | <name>]
    if (args[0] === "backup" || args[0] === "b") {
        await restoreBackup(args[1]);
        return;
    }

    const requestedTargets = args.length > 0 ? args : defaultTargets;
    const resolvedTargets = [];

    for (const target of requestedTargets) {
        const absoluteTarget = path.resolve(root, target);
        if (await exists(absoluteTarget)) {
            resolvedTargets.push(absoluteTarget);
        }
    }

    const discoveredFiles = await Promise.all(
        resolvedTargets.map(collectFiles)
    );
    const files = [...new Set(discoveredFiles.flat())].filter((filePath) => {
        const ext = path.extname(filePath);
        return prettierExtensions.has(ext) || ext === ".astro";
    });

    const backupEntries = new Map();
    let updated = 0;

    for (const filePath of files) {
        const result = await formatFile(filePath);
        if (result.status === "updated") {
            const rel = path.relative(root, filePath);
            backupEntries.set(rel, result.original);
            console.log(`formatted ${rel}`);
            updated += 1;
        }
    }

    if (backupEntries.size > 0) {
        await createBackup(backupEntries);
    }

    console.log(`done: ${updated} file(s) updated`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
