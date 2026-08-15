---
name: create-yodoca-plugin
description: Creates a new portable Agent Plugin package in the Yodoca plugins catalog that conforms to Agent Plugins 1.0.0 and the Yodoca runtime subset. Use when adding a plugin to this repository, scaffolding plugin.json, skills/, or mcp.json, packaging MCP servers or Agent Skills, or when the user mentions Agent Plugins, agent-plugins.org, or a new Yodoca catalog plugin.
---

# Create Yodoca Plugin

Scaffold a plugin in **this repository** as an [Agent Plugins 1.0.0](https://agent-plugins.org/specification) package that **runs after Git import into Yodoca** (Agent `/plugins` and `/admin/plugins`). Canonical authoring guide: [Build an Agent Plugin](https://agent-plugins.org/plugin-authors). Runtime subset: [spec.md](spec.md).

This catalog is **not** a Cursor, Codex, or Claude marketplace repo. Do not create `.cursor-plugin/`, `marketplace.json`, `rules/`, `agents/`, `commands/`, or `hooks/` as portable components. Do not write to `~/.cursor/plugins/local/`.

## Yodoca runtime

After import, Yodoca:

- Projects each `SKILL.md` into a DB instruction pack (frontmatter + markdown body). It does **not** execute `scripts/`, mount `references/` or `assets/`, or run local `git` / `gh` / `python`.
- Connects remote MCP (`streamable-http` or `sse`). Gateway does **not** execute `stdio` MCP.

Author for that runtime. If a scenario needs a local shell or a bundled binary, it does not belong in this catalog.

## Required inputs

Collect before writing files:

1. Plugin `name` (directory name = `plugin.json` `name`)
2. Purpose and target users
3. Components: `skills`, `mcp`, or both (at least one)
4. For each skill: name, description (what + when), instructions that use this plugin's MCP tools
5. For each MCP server: `streamable-http` URL and auth model (OAuth or PAT on the client)
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

Do **not** add `skills/<skill-name>/scripts/`. Optional `references/` or `assets/` are ignored by Yodoca — put every required step in `SKILL.md`. Client extension dir `com.yodoca.platform/` only if requested.

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

Frontmatter requires `name` and `description` (what + when, third person, ≤1024 chars). Write the skill body in English. Keep `SKILL.md` under 500 lines. Put every required instruction in that file — Yodoca does not inject `references/`.

Instructions MUST use this plugin's MCP tools. Do not tell the agent to run `python scripts/...`, `bash scripts/...`, local `git`, or `gh` as the working path. If MCP cannot cover a scenario, state the limitation instead of a CLI fallback.

Follow [create-skill](https://agentskills.io/specification) quality: concise, trigger terms in description.

### 4. Add `mcp.json` (if any)

Root file only. Top-level keys: `$schema`, `mcpServers`. Schema: `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`.

This catalog ships **hosted** MCP only:

| Transport | Required | Optional |
| --- | --- | --- |
| `streamable-http` | `type`, `url` | literal `headers` |
| `sse` | `type`, `url` | literal `headers` — only if the server cannot speak Streamable HTTP |

Do **not** add `stdio` servers. Yodoca Gateway does not execute them.

Rules:

- Remote `url` is absolute `http`/`https`, no userinfo, no fragment. Non-loopback MUST be `https`.
- Headers and URLs are public package data: no secrets, API keys, Bearer tokens, or `${VAR}` substitution.
- Auth is client-managed (OAuth, user env). Document it in the plugin README.

Prefer `streamable-http` for hosted servers (see `context7/mcp.json`).

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
- Do not add `skills/*/scripts/` or `stdio` MCP.
- Do not put secrets in the package.
- Keep the plugin focused on one use case.
- Follow existing catalog example: `context7/`.

## Spec drift

If a requirement is ambiguous, prefer [the specification](https://agent-plugins.org/specification) and this catalog's Yodoca subset in [spec.md](spec.md) over memory.
