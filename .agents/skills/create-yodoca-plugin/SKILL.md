---
name: create-yodoca-plugin
description: Creates a new portable Agent Plugin package in the Yodoca plugins catalog that conforms to Agent Plugins 1.0.0. Use when adding a plugin to this repository, scaffolding plugin.json, skills/, or mcp.json, packaging MCP servers or Agent Skills, or when the user mentions Agent Plugins, agent-plugins.org, or a new Yodoca catalog plugin.
---

# Create Yodoca Plugin

Scaffold a plugin in **this repository** as an [Agent Plugins 1.0.0](https://agent-plugins.org/specification) package. Canonical authoring guide: [Build an Agent Plugin](https://agent-plugins.org/plugin-authors).

This catalog is **not** a Cursor marketplace repo. Do not create `.cursor-plugin/`, `marketplace.json`, `rules/`, `agents/`, `commands/`, or `hooks/` as portable components. Do not write to `~/.cursor/plugins/local/`.

## Required inputs

Collect before writing files:

1. Plugin `name` (directory name = `plugin.json` `name`)
2. Purpose and target users
3. Components: `skills`, `mcp`, or both (at least one)
4. For each skill: name, description (what + when), instructions
5. For each MCP server: transport (`stdio` | `streamable-http`), command or URL, auth model
6. Optional: homepage URL, keywords, third-party NOTICE text

If a name or component set is missing, ask. Do not invent a product identity.

## Output location

Create `<repo-root>/<plugin-name>/`. Directory name MUST equal `plugin.json` `name`.

Canonical layout:

```text
<plugin-name>/
├── plugin.json
├── mcp.json                 # only if the plugin ships MCP
├── skills/<skill-name>/
│   └── SKILL.md
└── README.md
```

Optional: `skills/<skill-name>/{scripts,references,assets}/`, client extension dir `com.yodoca.platform/` (only if requested).

## Workflow

Copy and track:

```text
- [ ] Name valid and unique
- [ ] plugin.json (closed schema, Yodoca defaults)
- [ ] skills and/or mcp.json
- [ ] Plugin README.md (Russian)
- [ ] Catalog row in repo README.md
- [ ] NOTICE update if third-party
- [ ] validator passes (one runtime)
```

### 1. Validate the name

`name` MUST match `^(?!.*(?:--|\\.\\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$` (1–64 chars). Reject uppercase, leading/trailing `-` or `.`, `--`, `..`.

Abort if `<repo-root>/<name>/` already exists.

### 2. Write `plugin.json`

Use only these top-level keys: `$schema`, `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `extensions`.

Required Yodoca defaults (override only if the user gives different identity):

- `$schema`: `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`
- `version`: `1.0.0` unless specified
- `author`: `{ "name": "Yodoca", "url": "https://yodoca.ru" }`
- `repository`: `https://github.com/yodoca/plugins`
- `license`: `Apache-2.0`

`description` in English, one sentence, plugin purpose. `homepage` only if a real URL exists. `extensions` only for client-owned data. Never put skills or MCP inside `plugin.json`.

Templates: [templates.md](templates.md). Field rules: [spec.md](spec.md).

### 3. Add skills (if any)

Each skill is an **immediate** child of `skills/` with `SKILL.md`. Do not nest skills. `name` in frontmatter MUST equal the directory name (Agent Skills: `a-z0-9-`, 1–64, no leading/trailing `-`, no `--`).

Frontmatter requires `name` and `description` (what + when, third person, ≤1024 chars). Write the skill body in English. Keep `SKILL.md` under 500 lines; put detail in `references/`.

Follow [create-skill](https://agentskills.io/specification) quality: concise, trigger terms in description, one-level file links.

### 4. Add `mcp.json` (if any)

Root file only. Top-level keys: `$schema`, `mcpServers`. Schema: `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`.

| Transport | Required | Optional |
| --- | --- | --- |
| `stdio` | `type`, `command` | `args`, `env`, `cwd` |
| `streamable-http` | `type`, `url` | literal `headers` |
| `sse` | `type`, `url` | literal `headers` — deprecated; prefer `streamable-http` |

Rules:

- `command` is one executable token (not a shell line). Bare name **or** plugin-relative path starting with `./`. No `${...}` in `command`.
- Explicit `cwd` MUST start with `./`, `${PLUGIN_ROOT}`, or `${PLUGIN_DATA}`.
- Expand `${PLUGIN_ROOT}` / `${PLUGIN_DATA}` only in `args`, `env` values, and `cwd`.
- Do not set env keys `PLUGIN_ROOT` or `PLUGIN_DATA`.
- Remote `url` is absolute `http`/`https`, no userinfo, no fragment. Non-loopback MUST be `https`.
- Headers and URLs are public package data: no secrets, API keys, Bearer tokens, or `${VAR}` substitution.
- Auth is client-managed (OAuth, user env). Document it in the plugin README.

Prefer `streamable-http` for hosted servers (see `context7/mcp.json`). Prefer `stdio` with `./bin/...` for bundled binaries.

### 5. Write plugin `README.md` (Russian)

Match `context7/README.md`: what it is, Agent Plugins 1.0.0, component table, tree, MCP tools if any, auth notes, links to [agent-plugins.org](https://agent-plugins.org/) and [agentskills.io](https://agentskills.io/specification).

Do not copy `LICENSE` into the plugin; the repo root license applies.

### 6. Register in the catalog

Add a row to the table in repo `README.md`:

`| [<name>](./<name>) | <Russian one-liner> | MCP (...), skill \`...\` |`

If the plugin packages a third-party service, append a short attribution to `NOTICE`.

### 7. Validate

Python and Node implementations are equivalent. Run **exactly one** from repo root — whichever runtime is already available. Do not run both. Do not install a runtime just to use the other copy.

```bash
python .agents/skills/create-yodoca-plugin/scripts/validate-plugin.py ./<plugin-name>
```

```bash
node .agents/skills/create-yodoca-plugin/scripts/validate-plugin.js ./<plugin-name>
```

On Windows PowerShell use `python` / `node` as present. Fix every error before stopping. Then report the created tree, `plugin.json`, catalog row, and validator result.

## Guardrails

- Package paths stay inside the plugin root. Config paths defined as package paths begin with `./`. No `..`.
- v1 portable components are **only** skills and MCP. Client extras go under reverse-domain dirs (e.g. `com.yodoca.platform/`), never in `plugin.json` core fields.
- Do not add Cursor marketplace files (`.cursor-plugin/plugin.json`, rules, agents, commands, hooks.json).
- Do not put secrets in the package.
- Keep the plugin focused on one use case.
- Follow existing catalog example: `context7/`.

## Spec drift

If a requirement is ambiguous, prefer [the specification](https://agent-plugins.org/specification) and schemas over memory. Summary of closed fields and constraints: [spec.md](spec.md).
