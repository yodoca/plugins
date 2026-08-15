# Agent Plugins 1.0.0 — authoring constraints

Normative text: [specification](https://agent-plugins.org/specification). Schemas: [plugin.schema.json](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json), [mcp.schema.json](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json). Skill format: [Agent Skills](https://agentskills.io/specification).

## Manifest (`plugin.json`)

Closed object. Required: `$schema`, `name`.

| Field | Type | Notes |
| --- | --- | --- |
| `$schema` | string | MUST be `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json` |
| `name` | string | 1–64; `a-z` `0-9` `-` `.`; start/end alphanumeric; no `--` or `..` |
| `version` | string | SemVer recommended, not enforced |
| `description` | string | Short purpose |
| `author` | object | Only `name`, `email`, `url` strings |
| `homepage` | string | |
| `repository` | string | |
| `license` | string | SPDX recommended (`Apache-2.0` in this repo) |
| `keywords` | string[] | |
| `extensions` | object | Keys = reverse-domain namespaces; values = objects |

Unknown top-level fields are schema violations (clients ignore them). Other schema violations are fatal. Skills and MCP MUST NOT appear in the manifest.

## Discovery

| Component | Location | Missing |
| --- | --- | --- |
| Skills | `skills/<dir>/SKILL.md` (immediate children only) | OK if `skills/` absent |
| MCP | `mcp.json` at plugin root | OK if file absent |

If `skills` exists but is not a directory, or `mcp.json` exists but is not a file, that component type is invalid.

Invalid skill → skip that skill. Invalid top-level `mcp.json` → disable MCP for the plugin. Invalid one server → disable only that server.

## Skills

- Directory name = frontmatter `name`.
- `name`: 1–64, `a-z0-9-`, no leading/trailing `-`, no `--`.
- `description`: 1–1024, non-empty, what + when.
- Optional frontmatter: `license`, `compatibility` (≤500), `metadata` (string→string), `allowed-tools`.
- Optional dirs: `scripts/`, `references/`, `assets/` (conventions, not an allowlist).
- Clients do not recurse for nested `SKILL.md`.

## MCP (`mcp.json`)

Closed object. Required: `$schema` = `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`, `mcpServers` (object, may be empty).

### stdio

- `command`: one token; bare executable or `./...` inside the plugin. No placeholder expansion.
- `args` / `env` values / `cwd`: may contain `${PLUGIN_ROOT}` and `${PLUGIN_DATA}` (single-pass, non-recursive).
- `cwd` if set: `./...`, `${PLUGIN_ROOT}...`, or `${PLUGIN_DATA}...`. Default cwd is plugin root.
- `env` MUST NOT define `PLUGIN_ROOT` or `PLUGIN_DATA`.

### streamable-http and sse

- `url`: absolute HTTP(S), no userinfo, no fragment. Non-loopback → HTTPS.
- `headers`: literal strings only. No credentials. No `${VAR}`.
- Agent Plugins 1.0.0 has no portable OAuth/secret fields. Auth is client-managed.
- `sse` is deprecated; do not choose it for new Yodoca plugins unless a server only speaks HTTP+SSE.

## Package containment

Any plugin-relative path field MUST start with `./` and resolve inside the plugin root. No `..`. No escaping via symlinks.

## Client extensions (non-portable)

Manifest: `extensions.<namespace>` objects. Files: top-level directory named exactly the namespace (`com.yodoca.platform/`). Other clients ignore them. Do not use extensions to smuggle skills or MCP.
