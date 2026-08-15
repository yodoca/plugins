#!/usr/bin/env node
// Validate a Yodoca plugin package against Agent Plugins 1.0.0 constraints.
// Equivalent to validate-plugin.py. Agents should run exactly one of the two.

import fs from "node:fs";
import path from "node:path";

const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const PLUGIN_NAME_RE = /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const SKILL_NAME_RE = /^(?!.*--)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const PLUGIN_FIELDS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);
const AUTHOR_FIELDS = new Set(["name", "email", "url"]);
const SECRET_HINT =
  /(api[_-]?key|secret|password|passwd|token|bearer\s+[a-z0-9._\-]+|sk-[a-z0-9]+|ghp_[a-z0-9]+)/i;
const PLACEHOLDER_RE = /\$\{[^}]+\}/;

function posix(filePath) {
  return filePath.split(path.sep).join("/");
}

function quote(value) {
  return `'${value}'`;
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function isDir(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extraKeys(obj, allowed) {
  return Object.keys(obj)
    .filter((key) => !allowed.has(key))
    .sort();
}

class Reporter {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  error(message) {
    this.errors.push(message);
  }

  warn(message) {
    this.warnings.push(message);
  }
}

function loadJson(filePath, reporter) {
  if (!exists(filePath)) {
    reporter.error(`missing file: ${posix(filePath)}`);
    return null;
  }
  let data;
  try {
    data = JSON.parse(readText(filePath));
  } catch (exc) {
    reporter.error(`${posix(filePath)}: invalid JSON (${exc.message})`);
    return null;
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    reporter.error(`${posix(filePath)}: top-level value must be an object`);
    return null;
  }
  return data;
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) {
    return null;
  }
  const parts = text.split("---");
  if (parts.length < 3) {
    return null;
  }
  const data = {};
  for (const raw of parts[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes(":")) {
      continue;
    }
    const idx = line.indexOf(":");
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    data[key] = value;
  }
  return data;
}

function isSecretValue(value) {
  return PLACEHOLDER_RE.test(value) || SECRET_HINT.test(value);
}

function validatePluginJson(pluginDir, reporter) {
  const filePath = path.join(pluginDir, "plugin.json");
  const data = loadJson(filePath, reporter);
  if (data === null) {
    return null;
  }

  const extra = extraKeys(data, PLUGIN_FIELDS);
  if (extra.length) {
    reporter.error(`plugin.json: unknown top-level fields: ${extra.join(", ")}`);
  }

  if (data.$schema !== PLUGIN_SCHEMA) {
    reporter.error(`plugin.json: $schema must be ${PLUGIN_SCHEMA}`);
  }

  let name = data.name;
  if (typeof name !== "string" || name.length < 1 || name.length > 64 || !PLUGIN_NAME_RE.test(name)) {
    reporter.error("plugin.json: invalid name (1-64 chars, a-z0-9.-, no -- or ..)");
    name = null;
  } else if (name !== path.basename(pluginDir)) {
    reporter.error(
      `plugin.json name ${quote(name)} must equal directory name ${quote(path.basename(pluginDir))}`
    );
  }

  for (const field of ["version", "description", "homepage", "repository", "license"]) {
    if (field in data && typeof data[field] !== "string") {
      reporter.error(`plugin.json: ${field} must be a string`);
    }
  }

  if ("author" in data) {
    const author = data.author;
    if (author === null || typeof author !== "object" || Array.isArray(author)) {
      reporter.error("plugin.json: author must be an object");
    } else {
      const extraAuthor = extraKeys(author, AUTHOR_FIELDS);
      if (extraAuthor.length) {
        reporter.error(`plugin.json: author has unknown fields: ${extraAuthor.join(", ")}`);
      }
      for (const [key, value] of Object.entries(author)) {
        if (typeof value !== "string") {
          reporter.error(`plugin.json: author.${key} must be a string`);
        }
      }
    }
  }

  if ("keywords" in data) {
    const keywords = data.keywords;
    if (!Array.isArray(keywords) || keywords.some((item) => typeof item !== "string")) {
      reporter.error("plugin.json: keywords must be an array of strings");
    }
  }

  if ("extensions" in data) {
    const extensions = data.extensions;
    if (extensions === null || typeof extensions !== "object" || Array.isArray(extensions)) {
      reporter.error("plugin.json: extensions must be an object");
    } else {
      for (const [key, value] of Object.entries(extensions)) {
        if (value === null || typeof value !== "object" || Array.isArray(value)) {
          reporter.error(`plugin.json: extensions.${key} must be an object`);
        }
      }
    }
  }

  return name;
}

function validateSkills(pluginDir, reporter) {
  const skillsDir = path.join(pluginDir, "skills");
  const found = [];
  if (!exists(skillsDir)) {
    return found;
  }
  if (!isDir(skillsDir)) {
    reporter.error("skills exists but is not a directory");
    return found;
  }

  const children = fs.readdirSync(skillsDir).sort();
  for (const childName of children) {
    const child = path.join(skillsDir, childName);
    if (!isDir(child)) {
      reporter.warn(`skills/: ignoring non-directory ${childName}`);
      continue;
    }
    const skillMd = path.join(child, "SKILL.md");
    if (!isFile(skillMd)) {
      reporter.error(`skills/${childName}/: missing SKILL.md`);
      continue;
    }
    if (isDir(path.join(child, "scripts"))) {
      reporter.error(
        `skills/${childName}/scripts is not allowed: Yodoca does not execute skill scripts`
      );
    }
    const frontmatter = parseFrontmatter(readText(skillMd));
    if (frontmatter === null) {
      reporter.error(`skills/${childName}/SKILL.md: missing YAML frontmatter`);
      continue;
    }
    const name = frontmatter.name || "";
    const description = frontmatter.description || "";
    if (!SKILL_NAME_RE.test(name) || name.length < 1 || name.length > 64) {
      reporter.error(`skills/${childName}/SKILL.md: invalid name ${quote(name)}`);
    } else if (name !== childName) {
      reporter.error(
        `skills/${childName}/SKILL.md: name ${quote(name)} must equal directory name`
      );
    }
    if (!description || description.length > 1024) {
      reporter.error(`skills/${childName}/SKILL.md: description must be 1-1024 characters`);
    }
    found.push(name || childName);
  }
  return found;
}

function validateRemote(serverId, server, reporter) {
  const extra = extraKeys(server, new Set(["type", "url", "headers"]));
  if (extra.length) {
    reporter.error(`mcp.json ${serverId}: unknown remote fields: ${extra.join(", ")}`);
  }

  const url = server.url;
  if (typeof url !== "string" || !url) {
    reporter.error(`mcp.json ${serverId}: url must be a non-empty string`);
    return;
  }
  if (PLACEHOLDER_RE.test(url)) {
    reporter.error(`mcp.json ${serverId}: url must not contain placeholders`);
  }
  const schemeEnd = url.indexOf("://");
  const scheme = schemeEnd === -1 ? "" : url.slice(0, schemeEnd);
  if (schemeEnd === -1 || (scheme !== "http" && scheme !== "https")) {
    reporter.error(`mcp.json ${serverId}: url must be an absolute http(s) URL`);
  }
  const afterScheme = schemeEnd === -1 ? url : url.slice(schemeEnd + 3);
  const hostPort = afterScheme.split("/")[0];
  if (hostPort.includes("@")) {
    reporter.error(`mcp.json ${serverId}: url must not include userinfo`);
  }
  if (url.includes("#")) {
    reporter.error(`mcp.json ${serverId}: url must not include a fragment`);
  }
  const host = hostPort.split(":")[0].toLowerCase();
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (url.startsWith("http://") && !loopback) {
    reporter.error(`mcp.json ${serverId}: non-loopback url must use https`);
  }

  if ("headers" in server && (server.headers === null || typeof server.headers !== "object" ||
      Array.isArray(server.headers))) {
    reporter.error(`mcp.json ${serverId}: headers must be an object`);
    return;
  }
  if (server.headers && typeof server.headers === "object" && !Array.isArray(server.headers)) {
    for (const [key, value] of Object.entries(server.headers)) {
      if (typeof value !== "string") {
        reporter.error(`mcp.json ${serverId}: header ${key} must be a string`);
      } else if (isSecretValue(value)) {
        reporter.error(
          `mcp.json ${serverId}: header ${key} looks like a secret or placeholder`
        );
      }
    }
  }
}

function validateMcp(pluginDir, reporter) {
  const filePath = path.join(pluginDir, "mcp.json");
  if (!exists(filePath)) {
    return [];
  }
  if (!isFile(filePath)) {
    reporter.error("mcp.json exists but is not a file");
    return [];
  }

  const data = loadJson(filePath, reporter);
  if (data === null) {
    return [];
  }

  const extra = extraKeys(data, new Set(["$schema", "mcpServers"]));
  if (extra.length) {
    reporter.error(`mcp.json: unknown top-level fields: ${extra.join(", ")}`);
  }
  if (data.$schema !== MCP_SCHEMA) {
    reporter.error(`mcp.json: $schema must be ${MCP_SCHEMA}`);
  }

  const servers = data.mcpServers;
  if (servers === null || typeof servers !== "object" || Array.isArray(servers)) {
    reporter.error("mcp.json: mcpServers must be an object");
    return [];
  }

  const found = [];
  for (const [serverId, server] of Object.entries(servers)) {
    found.push(serverId);
    if (server === null || typeof server !== "object" || Array.isArray(server)) {
      reporter.error(`mcp.json ${serverId}: server config must be an object`);
      continue;
    }
    const transport = server.type;
    if (transport === "stdio") {
      reporter.error(
        `mcp.json ${serverId}: stdio is not allowed; this catalog ships hosted MCP only`
      );
    } else if (transport === "streamable-http" || transport === "sse") {
      if (transport === "sse") {
        reporter.warn(`mcp.json ${serverId}: sse is deprecated; prefer streamable-http`);
      }
      validateRemote(serverId, server, reporter);
    } else {
      reporter.error(`mcp.json ${serverId}: type must be streamable-http or sse`);
    }
  }
  return found;
}

function validateReadme(pluginDir, reporter) {
  if (!isFile(path.join(pluginDir, "README.md"))) {
    reporter.error("missing README.md");
  }
}

function validateCatalog(pluginName, catalog, reporter) {
  if (!isFile(catalog)) {
    reporter.error(`catalog file not found: ${posix(catalog)}`);
    return;
  }
  const text = readText(catalog);
  if (!text.includes(`](./${pluginName})`) && !text.includes(`](./${pluginName}/)`)) {
    reporter.error(`${posix(catalog)}: missing catalog row for ${pluginName}`);
  }
}

function parseArgs(argv) {
  const args = { pluginDir: null, catalog: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--catalog") {
      args.catalog = argv[i + 1];
      i += 1;
    } else if (arg === "-h" || arg === "--help") {
      console.log("Usage: validate-plugin.js <plugin_dir> [--catalog README.md]");
      process.exit(0);
    } else if (arg.startsWith("-")) {
      console.error(`error: unknown option ${arg}`);
      process.exit(2);
    } else if (!args.pluginDir) {
      args.pluginDir = arg;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.pluginDir) {
    console.error("error: plugin_dir is required");
    return 2;
  }

  const pluginDir = path.resolve(args.pluginDir);
  const reporter = new Reporter();

  if (!isDir(pluginDir)) {
    console.error(`error: ${posix(pluginDir)} is not a directory`);
    return 2;
  }

  const name = validatePluginJson(pluginDir, reporter);
  const skills = validateSkills(pluginDir, reporter);
  const servers = validateMcp(pluginDir, reporter);
  validateReadme(pluginDir, reporter);

  if (!skills.length && !servers.length) {
    reporter.error("plugin has neither skills nor MCP servers");
  }

  const catalog = args.catalog
    ? path.resolve(args.catalog)
    : path.resolve(pluginDir, "..", "README.md");
  if (name) {
    validateCatalog(name, catalog, reporter);
  }

  for (const warning of reporter.warnings) {
    console.log(`warning: ${warning}`);
  }
  for (const error of reporter.errors) {
    console.log(`error: ${error}`);
  }

  if (reporter.errors.length) {
    console.log(`FAIL ${path.basename(pluginDir)}: ${reporter.errors.length} error(s)`);
    return 1;
  }

  console.log(
    `OK ${path.basename(pluginDir)}: ${skills.length} skill(s), ${servers.length} MCP server(s)`
  );
  return 0;
}

process.exit(main());
