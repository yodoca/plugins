#!/usr/bin/env node
// Validates every Agent Plugin package in this catalog against the
// Agent Plugins 1.0.0 schemas plus the additional semantic and operational
// requirements the specification layers on top of those schemas.
//
// Spec references:
//   - Agent Plugins 1.0.0: https://agent-plugins.org/specification
//   - Agent Skills:        https://agentskills.io/specification
//
// Exit code 0 = all packages valid, 1 = at least one problem was found.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import yaml from "js-yaml";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const schemaDir = join(scriptDir, "schemas");

const PLUGIN_SCHEMA_ID = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA_ID = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";

const ajv = new Ajv2020({ allErrors: true, strict: false });
const pluginSchema = readJson(join(schemaDir, "plugin.schema.json"));
const mcpSchema = readJson(join(schemaDir, "mcp.schema.json"));
const validatePluginManifest = ajv.compile(pluginSchema);
const validateMcpConfig = ajv.compile(mcpSchema);

const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let hadError = false;
let pluginCount = 0;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

const errors = [];
function fail(pkg, message) {
  hadError = true;
  errors.push(`  [FAIL] ${pkg}: ${message}`);
}

// A plugin package is any immediate non-dot subdirectory of the repo root.
// node_modules is ignored because npm ci creates it before validation runs.
const SKIP_ROOT_DIRS = new Set(["node_modules"]);

function discoverPlugins() {
  return readdirSync(repoRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !SKIP_ROOT_DIRS.has(e.name))
    .map((e) => e.name)
    .sort();
}

function validatePlugin(name) {
  pluginCount += 1;
  const pkgRoot = join(repoRoot, name);
  const checks = [];

  // ---- plugin.json ----
  const manifestPath = join(pkgRoot, "plugin.json");
  if (!isFile(manifestPath)) {
    fail(name, "missing plugin.json; every non-dot root directory must be a plugin package");
    return;
  }
  let manifest;
  try {
    manifest = readJson(manifestPath);
  } catch (err) {
    fail(name, `plugin.json is not valid JSON: ${err.message}`);
    return;
  }
  if (!validatePluginManifest(manifest)) {
    for (const e of validatePluginManifest.errors) {
      fail(name, `plugin.json${e.instancePath || ""} ${e.message}`);
    }
  } else {
    checks.push("plugin.json matches plugin.schema.json");
  }
  if (manifest.$schema !== PLUGIN_SCHEMA_ID) {
    fail(name, `plugin.json $schema must be ${PLUGIN_SCHEMA_ID}`);
  }

  // ---- mcp.json (optional, §7.2) ----
  const mcpPath = join(pkgRoot, "mcp.json");
  if (existsSync(mcpPath)) {
    if (!isFile(mcpPath)) {
      fail(name, "mcp.json exists but is not a regular file");
    } else {
      let mcp;
      try {
        mcp = readJson(mcpPath);
      } catch (err) {
        fail(name, `mcp.json is not valid JSON: ${err.message}`);
        mcp = null;
      }
      if (mcp) {
        if (!validateMcpConfig(mcp)) {
          for (const e of validateMcpConfig.errors) {
            fail(name, `mcp.json${e.instancePath || ""} ${e.message}`);
          }
        } else {
          checks.push(`mcp.json matches mcp.schema.json (${Object.keys(mcp.mcpServers).length} server(s))`);
        }
        if (mcp.$schema !== MCP_SCHEMA_ID) {
          fail(name, `mcp.json $schema must be ${MCP_SCHEMA_ID}`);
        }
        validateMcpSemantics(name, mcp);
      }
    }
  }

  // ---- skills/ (optional, §6.1 / §7.1) ----
  const skillsDir = join(pkgRoot, "skills");
  if (existsSync(skillsDir)) {
    if (!isDir(skillsDir)) {
      fail(name, "skills exists but is not a directory");
    } else {
      const skillDirs = readdirSync(skillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
      for (const skill of skillDirs) {
        validateSkill(name, skillsDir, skill, checks);
      }
    }
  }

  if (!hasErrorFor(name)) {
    console.log(`  [OK]   ${name}`);
    for (const c of checks) console.log(`           - ${c}`);
  }
}

function hasErrorFor(name) {
  return errors.some((e) => e.includes(`] ${name}:`));
}

function validateSkill(pkg, skillsDir, skill, checks) {
  const skillPath = join(skillsDir, skill);
    const skillMd = join(skillPath, "SKILL.md");
  if (!isFile(skillMd)) {
    fail(pkg, `skills/${skill} has no SKILL.md regular file`);
    return;
  }
  const scriptsDir = join(skillPath, "scripts");
  if (existsSync(scriptsDir)) {
    fail(
      pkg,
      `skills/${skill}/scripts is not allowed: Yodoca does not execute skill scripts`,
    );
  }
  const raw = readFileSync(skillMd, "utf8");
  const fm = parseFrontmatter(raw);
  if (!fm) {
    fail(pkg, `skills/${skill}/SKILL.md is missing YAML frontmatter`);
    return;
  }
  let data;
  try {
    data = yaml.load(fm);
  } catch (err) {
    fail(pkg, `skills/${skill}/SKILL.md frontmatter is not valid YAML: ${err.message}`);
    return;
  }
  if (typeof data !== "object" || data === null) {
    fail(pkg, `skills/${skill}/SKILL.md frontmatter must be a mapping`);
    return;
  }

  // name: required, 1-64, [a-z0-9-], no lead/trail/consecutive hyphen, matches dir.
  const nm = data.name;
  if (typeof nm !== "string" || nm.length < 1 || nm.length > 64 || !SKILL_NAME_RE.test(nm)) {
    fail(pkg, `skills/${skill}/SKILL.md name is invalid: ${JSON.stringify(nm)}`);
  } else if (nm !== skill) {
    fail(pkg, `skills/${skill}/SKILL.md name "${nm}" must match directory name "${skill}"`);
  }

  // description: required, 1-1024, non-empty.
  const desc = data.description;
  if (typeof desc !== "string" || desc.trim().length === 0 || desc.length > 1024) {
    fail(pkg, `skills/${skill}/SKILL.md description must be a non-empty string of at most 1024 characters`);
  }

  // compatibility: optional, 1-500.
  if (data.compatibility !== undefined) {
    if (typeof data.compatibility !== "string" || data.compatibility.length < 1 || data.compatibility.length > 500) {
      fail(pkg, `skills/${skill}/SKILL.md compatibility must be a string of 1-500 characters`);
    }
  }

  // metadata: optional map string -> string.
  if (data.metadata !== undefined) {
    const md = data.metadata;
    if (typeof md !== "object" || md === null || Array.isArray(md) || Object.values(md).some((v) => typeof v !== "string")) {
      fail(pkg, `skills/${skill}/SKILL.md metadata must be a map of string values`);
    }
  }

  if (!hasErrorFor(pkg)) {
    checks.push(`skill "${skill}" frontmatter valid`);
  }
}

function parseFrontmatter(raw) {
  const text = raw.replace(/^\uFEFF/, "");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\s*(\r?\n|$)/);
  return m ? m[1] : null;
}

function validateMcpSemantics(pkg, mcp) {
  for (const [serverName, server] of Object.entries(mcp.mcpServers ?? {})) {
    if (!server || typeof server !== "object") continue;
    if (server.type === "stdio") {
      fail(
        pkg,
        `mcp.json server "${serverName}" uses stdio; this catalog ships hosted MCP only (Yodoca Gateway does not execute stdio)`,
      );
      continue;
    } else if (server.type === "streamable-http" || server.type === "sse") {
      validateRemoteUrl(pkg, serverName, server.url);
      validateHeaders(pkg, serverName, server.headers);
    }
  }
}

function validateRemoteUrl(pkg, serverName, urlStr) {
  let url;
  try {
    url = new URL(urlStr);
  } catch {
    fail(pkg, `mcp.json server "${serverName}" url is not an absolute URL`);
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    fail(pkg, `mcp.json server "${serverName}" url must use http or https`);
  }
  if (url.hash) {
    fail(pkg, `mcp.json server "${serverName}" url must not contain a fragment`);
  }
  if (url.username || url.password) {
    fail(pkg, `mcp.json server "${serverName}" url must not contain user information`);
  }
  const host = url.hostname;
  const isLoopback = host === "localhost" || host === "::1" || /^127\./.test(host);
  if (!isLoopback && url.protocol !== "https:") {
    fail(pkg, `mcp.json server "${serverName}" non-loopback url must use https`);
  }
}

function validateHeaders(pkg, serverName, headers) {
  if (!headers || typeof headers !== "object") return;
  const seen = new Set();
  for (const key of Object.keys(headers)) {
    const lower = key.toLowerCase();
    if (seen.has(lower)) {
      fail(pkg, `mcp.json server "${serverName}" has duplicate header "${key}" (case-insensitive)`);
    }
    seen.add(lower);
  }
}

console.log(`Validating Agent Plugins catalog at ${repoRoot}`);
const plugins = discoverPlugins();
if (plugins.length === 0) {
  console.error("No plugin packages found (no non-dot root directory).");
  process.exit(1);
}
for (const name of plugins) {
  validatePlugin(name);
}

console.log("");
if (hadError) {
  console.error(`Validation FAILED. ${pluginCount} package(s) checked.`);
  for (const line of errors) console.error(line);
  process.exit(1);
}
console.log(`Validation PASSED. ${pluginCount} package(s) checked, all conform to Agent Plugins 1.0.0 and the Yodoca catalog subset.`);
