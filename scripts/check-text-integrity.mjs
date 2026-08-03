import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const roots = ["src", "tests", "scripts", "supabase"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".sql", ".md"]);
const ignored = new Set(["node_modules", ".next", ".git"]);
const patterns = [
  { name: "UTF-8 interpretado como Latin-1", expression: /(?:Ã[\x80-\xBF]|Â[\x80-\xBF]|â(?:€|†|€¢|€¦)|ðŸ)/u },
  { name: "caractere de substituição", expression: /�/u },
  { name: "acentuação substituída por interrogação", expression: /\b(?:n\?o|est\?|mat\?ria|voc\?|p\?gina|not\?cia|lan\?amento|usu\?rio|configura\?\?)/iu },
  { name: "caractere CJK inesperado", expression: /[\u3400-\u9fff]/u },
];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (extensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const files = (await Promise.all(roots.map((root) => collect(root)))).flat();
const failures = [];
for (const file of files) {
  if (file.endsWith("check-text-integrity.mjs")) continue;
  const content = await readFile(file, "utf8");
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    for (const pattern of patterns) {
      if (pattern.expression.test(lines[index])) failures.push(`${relative(process.cwd(), file)}:${index + 1} — ${pattern.name}`);
    }
  }
}

if (failures.length) {
  process.stderr.write(`Falha de integridade textual:\n${failures.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`Integridade textual aprovada em ${files.length} arquivos.\n`);
