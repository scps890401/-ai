import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const ignored = new Set(["node_modules", "dist", ".git", ".pnpm-store", "coverage", ".manus-logs"]);
const ignoredFile = /(^|\/)\.env(?:\.|$)|\.(png|jpe?g|gif|webp|wasm|zip|lock)$/i;
const textFile = /\.(ts|tsx|js|mjs|json|md|css|html|yml|yaml|sql)$/i;
const patterns = [
  { name: "OpenAI API key", regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "GitHub personal token", regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g },
  { name: "private key block", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(absolute));
    else if (entry.isFile()) paths.push(absolute);
  }
  return paths;
}

const findings = [];
for (const file of await walk(root)) {
  const path = relative(root, file);
  if (ignoredFile.test(path) || !textFile.test(path)) continue;
  const content = await readFile(file, "utf8");
  for (const pattern of patterns) {
    const matches = [...content.matchAll(pattern.regex)];
    for (const match of matches) findings.push({ file: path, type: pattern.name, offset: match.index ?? 0 });
  }
}

if (findings.length) {
  console.error("Potential secrets detected. Remove or rotate them before committing:");
  for (const finding of findings) console.error(`- ${finding.type}: ${finding.file} @ ${finding.offset}`);
  process.exitCode = 1;
} else {
  console.log("Secret scan passed: no supported credential patterns found in tracked source candidates.");
}
