import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const backupRoot = resolve(process.argv[2] || "tmp/backups");
const entries = (await readdir(backupRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse();
if (!entries.length) throw new Error("Nenhum backup encontrado");
const directory = resolve(backupRoot, entries[0]);
const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8"));
for (const table of manifest.tables.filter((item) => !item.skipped)) {
  await access(resolve(directory, `${table.table}.json`));
  const rows = JSON.parse(await readFile(resolve(directory, `${table.table}.json`), "utf8"));
  if (!Array.isArray(rows) || rows.length !== table.rows) throw new Error(`Contagem inválida em ${table.table}`);
}
const storage = JSON.parse(await readFile(resolve(directory, "storage-manifest.json"), "utf8"));
const storageObjects = Object.values(storage).reduce((total, objects) => total + objects.length, 0);
if (storageObjects !== manifest.storage_objects) throw new Error("Manifesto de Storage inconsistente");
process.stdout.write(JSON.stringify({ verified: true, directory, tables: manifest.tables.length, users: manifest.users, storage_objects: storageObjects }, null, 2));
