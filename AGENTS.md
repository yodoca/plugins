# AGENTS.md

Instructions for coding agents working in this repository. Format: [AGENTS.md](https://agents.md/). Human-facing catalog docs live in [README.md](./README.md).

The closest `AGENTS.md` to the file being edited wins. Explicit user chat prompts override this file.

## Project overview

Public catalog of plugins for [Yodoca Platform](https://yodoca.ru): [github.com/yodoca/plugins](https://github.com/yodoca/plugins). Each plugin is an [Agent Plugins 1.0.0](https://agent-plugins.org/specification) package in the **Yodoca runtime subset**: `SKILL.md` instruction packs plus hosted MCP. The repo is imported as a Git catalog into Yodoca Agent `/plugins` and `/admin/plugins`.

This is **not** a Cursor, Codex, or Claude marketplace repo. Do not create `.cursor-plugin/`, `marketplace.json`, `rules/`, `agents/`, `commands/`, or `hooks.json` as portable components. Do not write to `~/.cursor/plugins/local/`.

When memory disagrees with the spec, prefer:

- This catalog's Yodoca subset in [create-yodoca-plugin/spec.md](./.agents/skills/create-yodoca-plugin/spec.md)
- [Agent Plugins 1.0.0](https://agent-plugins.org/specification) and [schemas](https://agent-plugins.org/schemas)
- [Build an Agent Plugin](https://agent-plugins.org/plugin-authors)
- [Agent Skills](https://agentskills.io/specification)

Canonical catalog package: [`context7/`](./context7).

## Yodoca runtime

After Git import, Yodoca:

- Discovers first-level plugin directories with `plugin.json` (hidden root dirs such as `.agents` are skipped).
- Projects each `SKILL.md` into a database instruction pack. `scripts/`, `references/`, and `assets/` are not executed or injected.
- Connects remote MCP (`streamable-http` / `sse`). Gateway does not execute `stdio` MCP.

Do not author skills that tell the agent to run `python scripts/...`, local `git`, or `gh`. If MCP cannot cover a job, document the limit.

## Repository layout

```text
.
├── README.md                 # human catalog
├── AGENTS.md                 # this file
├── LICENSE                   # Apache-2.0 for the whole repo
├── NOTICE                    # third-party attribution
├── <plugin-name>/            # one plugin = one directory
│   ├── plugin.json
│   ├── mcp.json              # only if the plugin ships MCP
│   ├── skills/<skill>/SKILL.md
│   └── README.md
├── .agents/
│   ├── agents.md             # pointer to this file
│   └── skills/create-yodoca-plugin/
├── .github/workflows/        # catalog CI (hidden; not a plugin)
└── .scripts/                 # catalog validator (hidden; not a plugin)
    ├── validate-plugins.mjs
    ├── install-hooks.mjs
    ├── hooks/pre-commit
    └── schemas/
```

Visible (non-dot) directories at the repo root are plugin packages only. Catalog tooling lives in hidden directories (`.agents/`, `.scripts/`, `.github/`).

The plugin directory name **must** equal `plugin.json` `name`.

Portable v1 components are skills and MCP only. Client extensions go in reverse-domain directories (`com.yodoca.platform/`), never in core `plugin.json` fields.

## Adding and editing plugins

Before creating or changing a package, read and follow [create-yodoca-plugin](./.agents/skills/create-yodoca-plugin/SKILL.md). Templates: [templates.md](./.agents/skills/create-yodoca-plugin/templates.md). Field summary: [spec.md](./.agents/skills/create-yodoca-plugin/spec.md).

Minimum checklist:

1. Name is valid and unique: `^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$` (1–64).
2. `plugin.json` uses the closed schema and Yodoca defaults (`author`, `repository`, `license: Apache-2.0`).
3. At least one component: `skills/` and/or `mcp.json`.
4. Plugin README is in Russian.
5. A row in the catalog table in the root `README.md`.
6. If the package wraps a third-party service, add a short attribution in `NOTICE`.
7. The validator reports no errors.

Do not invent a product identity. If the name or component set is missing, ask.

## Test commands

Catalog-wide check (GitHub Actions and Git pre-commit run this):

```bash
npm ci
npm run validate
```

`npm ci` also sets `core.hooksPath` to `.scripts/hooks/`, so subsequent commits run the same validator. Do not commit a package it rejects.

For a single package while authoring, the Python and Node scripts in the create-yodoca-plugin skill are equivalent. Run **exactly one** — whichever interpreter is already available. Do not run both. Do not install a runtime just to use the other copy.

One plugin (substitute the directory name):

```bash
python .agents/skills/create-yodoca-plugin/scripts/validate-plugin.py ./<plugin-name>
```

```bash
node .agents/skills/create-yodoca-plugin/scripts/validate-plugin.js ./<plugin-name>
```

Canonical catalog example:

```bash
python .agents/skills/create-yodoca-plugin/scripts/validate-plugin.py ./context7
```

On Windows PowerShell, call `python` (not `python3` if the latter is missing) or `node`. If you changed the authoring skill, run **one** per-plugin script. If you changed the catalog validator or added a plugin, run `npm run validate`.

## Code style

- Change only what the task requires. Do not refactor adjacent code.
- JSON: keep key order as in `context7/plugin.json` and the templates.
- `plugin.json` `description`: one English sentence.
- `SKILL.md` body: English. Frontmatter `name` equals the skill directory name. `description`: what + when, third person, ≤1024 characters. Keep the file under 500 lines. Put every required step in `SKILL.md` (Yodoca does not inject `references/`).
- Skill instructions use this plugin's MCP tools. Do not add `skills/*/scripts/` or require local `git` / `gh` / `python`.
- Plugin README and the root catalog: Russian.
- Do not copy `LICENSE` into a plugin directory; the root license applies.
- Package paths stay inside the plugin root. Relative config paths start with `./`. No `..`.
- Skills are immediate children of `skills/` only (no nested skills).
- MCP is declared only in root `mcp.json`, never in `plugin.json`.
- Prefer `streamable-http` for hosted MCP. Do not choose `sse` for new plugins if the server speaks Streamable HTTP. Do not add `stdio` MCP.

## Security

- Secrets, API keys, Bearer tokens, and `${VAR}` substitution in MCP `url`/`headers` are forbidden by the 1.0.0 spec.
- Auth is client-managed (OAuth, user env). Document it in the plugin README.
- Do not set env keys `PLUGIN_ROOT` or `PLUGIN_DATA`.
- Non-loopback remote URLs must be `https`, with no userinfo and no fragment.

## Commits and PRs

- Commit only when the user explicitly asks.
- Commit messages: concise, Russian or English to match branch history; focus on why, not a file list.
- PR title: `[<plugin-name>] <short description>` for a single-plugin change; no prefix for catalog, authoring-skill, or infra edits.
- Run `npm run validate` before committing (pre-commit does this after `npm ci`).
- Do not commit `.env`, keys, or other secrets.

## Nested instructions

If a plugin needs its own agent rules, put `AGENTS.md` in that plugin directory. Agents read the nearest file in the tree.
