# context7

Переносимый [Agent Plugin](https://agent-plugins.org/) (спецификация 1.0.0). Даёт агенту актуальную, привязанную к версии документацию библиотек через MCP-сервер [Context7](https://context7.com).

Клиентский плагин Cursor из маркетплейса (`context7-plugin`) держит тот же MCP-сервер, плюс непереносимые компоненты: always-on rule, команду `/context7:docs` и субагента `docs-researcher`. В формате Agent Plugins v1 переносятся только skills и MCP; триггеры вынесены в description скилла.

## Состав

| Компонент | Путь | Назначение |
| --- | --- | --- |
| MCP-сервер | `mcp.json` | Удалённый Context7 по Streamable HTTP, вход через OAuth |
| Skill | `skills/context7-mcp/` | Когда и как резолвить библиотеку и запрашивать документацию |

```text
context7/
├── plugin.json
├── mcp.json
├── skills/
│   └── context7-mcp/
│       └── SKILL.md
└── README.md
```

## Инструменты MCP

1. `resolve-library-id` — по имени библиотеки возвращает Context7 ID вида `/vercel/next.js` и доступные версии. Пропускайте шаг, если пользователь уже указал ID `/org/project` или `/org/project/version`.
2. `query-docs` — по ID и запросу возвращает релевантные фрагменты документации и примеры кода. Один концепт на вызов.

## Аутентификация

Плагин указывает на `https://mcp.context7.com/mcp/oauth`. При первом подключении сервер отвечает `401`; клиент проходит OAuth 2.1 (Dynamic Client Registration и PKCE). Ключ в пакет не кладётся: Agent Plugins 1.0 запрещает секреты и подстановку `${VAR}` в `url` и `headers`.

Клиент без OAuth не подключит этот сервер. Это ошибка соединения одного MCP, а не всего плагина: скилл всё равно загружается.

## Ссылки

- [Context7](https://context7.com)
- [Спецификация Agent Plugins](https://agent-plugins.org/specification)
- [Спецификация Agent Skills](https://agentskills.io/specification)
