# Плагины Yodoca Platform

Публичный каталог [плагинов](https://github.com/yodoca/plugins) для [Yodoca Platform](https://yodoca.ru). Каждый плагин — отдельный переносимый пакет в формате [Agent Plugins v1.0](https://agent-plugins.org/) в **подмножестве Yodoca**: инструкции из `SKILL.md` и hosted MCP (`streamable-http`). Репозиторий импортируется в Agent как Git-каталог.

Yodoca не исполняет skill-скрипты и не запускает stdio MCP. Совместимые клиенты обнаруживают пакет по корневому `plugin.json` и загружают [Agent Skills](https://agentskills.io/specification) и [MCP-серверы](https://modelcontextprotocol.io/specification) в этих пределах.

## Формат пакета

Плагин — это каталог с обязательным манифестом и компонентами в фиксированных местах:

```text
my-plugin/
├── plugin.json          # обязательный манифест
├── skills/              # опционально: Agent Skills
│   └── summarize/
│       └── SKILL.md
├── mcp.json             # опционально: MCP-серверы
└── com.example.client/  # опционально: расширения конкретного клиента
```

Минимальный манифест:

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "name": "my-plugin"
}
```

Требования к пакету:

- `$schema` должен указывать на `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`.
- `name` — 1–64 символа: строчные латинские буквы, цифры, дефисы и точки; без `--` и `..`.
- Skills лежат в непосредственных подкаталогах `skills/`, у каждого есть `SKILL.md`. Каталог `scripts/` у skill запрещён.
- MCP-серверы описываются только в корневом `mcp.json`, не в `plugin.json`. В этом каталоге — hosted MCP (`streamable-http` / при необходимости `sse`), не `stdio`.
- Пути внутри пакета не выходят за его корень; относительные пути в конфигурации начинаются с `./`.

Полный контракт: [спецификация Agent Plugins 1.0.0](https://agent-plugins.org/specification). Как собрать пакет: [Build an Agent Plugin](https://agent-plugins.org/plugin-authors).

## Каталог

| Плагин | Описание | Компоненты |
| --- | --- | --- |
| [context7](./context7) | Актуальная документация библиотек через Context7 MCP | MCP (`streamable-http`), skill `context7-mcp` |
| [github](./github) | Репозитории, issues, PR и Actions через официальный GitHub MCP | MCP (`streamable-http`), skills `github`, `gh-address-comments`, `gh-fix-ci`, `gh-publish` |

## Как добавить плагин

1. Создайте каталог с именем плагина в корне репозитория.
2. Положите в него `plugin.json` со схемой Agent Plugins 1.0.0.
3. Добавьте компоненты: `skills/*/SKILL.md` и/или `mcp.json`.
4. Опишите плагин в таблице каталога выше.
5. Убедитесь, что пакет валиден по [схемам](https://agent-plugins.org/schemas) и не ссылается на файлы вне своего каталога.

## Проверка (валидация)

Каталог содержит валидатор, который проверяет каждый пакет по схемам и семантике Agent Plugins 1.0.0, плюс правила каталога Yodoca: нет `skills/*/scripts/` и нет stdio MCP.

```bash
npm ci        # установка зависимостей валидатора
npm run validate
```

Валидатор возвращает ненулевой код при любой ошибке. GitHub Actions запускает `npm run validate` на каждом pull request и на push в `main`. После `npm ci` тот же вызов стоит на Git pre-commit и блокирует коммит невалидного пакета. Официальные схемы вложены в `.scripts/schemas/` для детерминированной офлайн-проверки.

Клиентские расширения (хуки, настройки конкретного продукта) размещайте в каталогах с reverse-domain именем, например `com.yodoca.platform/`. Переносимое ядро при этом не меняется.

## Лицензия

Код распространяется по [Apache License 2.0](./LICENSE). См. также [NOTICE](./NOTICE).
