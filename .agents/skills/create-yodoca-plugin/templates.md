# File templates

Replace `<placeholders>`. Keep JSON keys in the order shown to match `context7/`.

## plugin.json

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "<plugin-name>",
  "version": "1.0.0",
  "description": "<English one-sentence purpose.>",
  "author": {
    "name": "Yodoca",
    "url": "https://yodoca.ru"
  },
  "homepage": "<https://example.com>",
  "repository": "https://github.com/yodoca/plugins",
  "license": "Apache-2.0",
  "keywords": ["<keyword>"]
}
```

Omit `homepage` when there is no real URL. Omit `keywords` only if none apply.

## mcp.json — Streamable HTTP

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "<server-id>": {
      "type": "streamable-http",
      "url": "https://example.com/mcp"
    }
  }
}
```

Do not add `stdio` MCP. This catalog is imported into Yodoca Gateway, which does not execute stdio servers.

## skills/<skill-name>/SKILL.md

```markdown
---
name: <skill-name>
description: <What it does>. Use when <trigger scenarios and keywords>.
---

# <Skill Title>

## When to use

- <trigger>

## Instructions

1. Identify the repository, issue, or other target from the user request. Ask if it is missing.
2. Call this plugin's MCP tools. Do not run local git, gh, or skill scripts.
3. If a needed MCP tool is unavailable, say so and stop that path.
```

Do not create `skills/<skill-name>/scripts/`. Put every required step in `SKILL.md`.

## README.md

Write in Russian. Include: title, one-paragraph purpose with Agent Plugins 1.0.0 link, component table, directory tree, MCP tool list if any, auth notes, spec links.

```markdown
# <plugin-name>

Переносимый [Agent Plugin](https://agent-plugins.org/) (спецификация 1.0.0) для [Yodoca Platform](https://yodoca.ru). <Назначение.>

## Состав

| Компонент | Путь | Назначение |
| --- | --- | --- |
| MCP-сервер | `mcp.json` | <транспорт и роль> |
| Skill | `skills/<skill-name>/` | <роль> |
```

Directory tree to include in the README (fenced as `text`):

```text
<plugin-name>/
├── plugin.json
├── mcp.json
├── skills/
│   └── <skill-name>/
│       └── SKILL.md
└── README.md
```

Closing links:

```markdown
## Ссылки

- [Спецификация Agent Plugins](https://agent-plugins.org/specification)
- [Спецификация Agent Skills](https://agentskills.io/specification)
```

Drop the MCP row/file from the tree when the plugin is skills-only.

## Catalog row (repo README.md)

```markdown
| [<plugin-name>](./<plugin-name>) | <Краткое описание по-русски> | MCP (`<transport>`), skill `<skill-name>` |
```
