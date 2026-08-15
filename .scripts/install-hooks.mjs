#!/usr/bin/env node
// Point Git at .scripts/hooks after npm ci. No-op when .git is missing
// (packed archive, incomplete checkout).
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(resolve(repoRoot, ".git"))) {
  process.exit(0);
}
try {
  execSync("git config core.hooksPath .scripts/hooks", {
    cwd: repoRoot,
    stdio: "ignore",
  });
} catch {
  // Not a usable git checkout.
}
