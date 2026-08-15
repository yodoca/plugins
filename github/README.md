# github

Переносимый [Agent Plugin](https://agent-plugins.org/) (спецификация 1.0.0). Даёт агенту доступ к репозиториям, issues, pull request'ам, поиску кода и GitHub Actions через официальный удалённый MCP-сервер [GitHub](https://github.com/github/github-mcp-server).

Клиентский плагин Cursor из маркетплейса держит тот же MCP-сервер и подставляет PAT в клиентских variables. Плагин Codex подключает GitHub App и локальный `gh`. В формате Agent Plugins v1 переносятся только skills и MCP; секреты в пакет не входят, триггеры вынесены в description скиллов.

## Состав

| Компонент | Путь | Назначение |
| --- | --- | --- |
| MCP-сервер | `mcp.json` | Удалённый GitHub MCP по Streamable HTTP, вход через OAuth или PAT на стороне клиента |
| Skill | `skills/github/` | Общий triage репозитория, PR и issues, маршрутизация на узкие workflow |
| Skill | `skills/gh-address-comments/` | Разбор review threads и выбранных правок по комментариям |
| Skill | `skills/gh-fix-ci/` | Диагностика падающих GitHub Actions и план фикса |
| Skill | `skills/gh-publish/` | Commit, push и открытие draft PR из локального checkout |

```text
github/
├── plugin.json
├── mcp.json
├── skills/
│   ├── github/
│   │   └── SKILL.md
│   ├── gh-address-comments/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── fetch_comments.py
│   ├── gh-fix-ci/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── inspect_pr_checks.py
│   └── gh-publish/
│       └── SKILL.md
└── README.md
```

## Инструменты MCP

Плагин указывает на default toolset `https://api.githubcopilot.com/mcp/`. Набор инструментов меняется у GitHub; типичные группы:

1. Репозитории и код — чтение файлов, поиск, коммиты, структура проекта.
2. Issues — список, создание, обновление, комментарии и метки.
3. Pull requests — метаданные, дифф, ревью, создание PR после push.
4. Поиск — code search и навигация по репозиторию.
5. Actions — workflow runs и логи, если клиент подключил соответствующий toolset; иначе скилл `gh-fix-ci` падает обратно на `gh`.

Полный перечень: [github/github-mcp-server](https://github.com/github/github-mcp-server) и [настройка GitHub MCP](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/set-up-the-github-mcp-server).

## Аутентификация

Плагин указывает на `https://api.githubcopilot.com/mcp/` без заголовков. При первом подключении сервер отвечает `401`; клиент проходит OAuth 2.1 (Dynamic Client Registration и PKCE) или подставляет PAT в своей конфигурации. Ключ в пакет не кладётся: Agent Plugins 1.0 запрещает секреты и подстановку `${VAR}` в `url` и `headers`.

Клиент без OAuth и без PAT не подключит этот сервер. Это ошибка соединения одного MCP, а не всего плагина: скиллы всё равно загружаются.

Скрипты `gh-address-comments` и `gh-fix-ci` вызывают GitHub CLI. Для них нужен `gh auth login` с правами на репозиторий (и `workflow` для логов Actions).

## Ссылки

- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [Настройка GitHub MCP](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/set-up-the-github-mcp-server)
- [Спецификация Agent Plugins](https://agent-plugins.org/specification)
- [Спецификация Agent Skills](https://agentskills.io/specification)
