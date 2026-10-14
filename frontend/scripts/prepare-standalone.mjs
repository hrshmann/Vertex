import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

for (const directory of ["public", path.join(".next", "static")]) {
  const source = path.join(projectRoot, directory);
  if (!existsSync(source)) continue;
  const destination = path.join(standaloneRoot, directory);
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}
