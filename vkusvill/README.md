# vkusvill

Переносимый [Agent Plugin](https://agent-plugins.org/) (спецификация 1.0.0) для [Yodoca Platform](https://yodoca.ru). Даёт агенту поиск товаров, состава и КБЖУ, скидок, аналогов, рецептов и магазинов [ВкусВилл](https://vkusvill.ru), а также сборку ссылки на корзину через официальный MCP-сервер.

## Состав

| Компонент | Путь | Назначение |
| --- | --- | --- |
| MCP-сервер | `mcp.json` | Удалённый ВкусВилл MCP по Streamable HTTP, без ключа |
| Skill | `skills/vkusvill/` | Когда и как искать товары, проверять состав и собирать `share_basket` |

```text
vkusvill/
├── plugin.json
├── mcp.json
├── skills/
│   └── vkusvill/
│       └── SKILL.md
└── README.md
```

## Инструменты MCP

Набор тулов задаёт сервер `https://mcp.vkusvill.ru/mcp`. На момент упаковки:

1. `vkusvill_products_search` — поиск товаров (`q`, сортировка, пагинация по 10, `vvonly`, `mode`).
2. `vkusvill_product_details` — состав, КБЖУ, фото и цена по `id` из поиска.
3. `vkusvill_product_barcode` — карточка товара по штрихкоду EAN-13.
4. `vkusvill_product_analogs` — аналоги по `id` из поиска.
5. `vkusvill_products_discount` — акционные товары (`card` / `quantity`).
6. `vkusvill_cart_link_create` — ссылка `https://vkusvill.ru/?share_basket=...` по `xml_id` и количеству `q`.
7. `vkusvill_recipes` — рецепты; фильтры приходят при вызове с `page=1`.
8. `vkusvill_shops` — магазины; фильтры региона/города/метро приходят при вызове с `page=1`.

В поиске `id` нужен для деталей и аналогов, `xml_id` — для корзины. Сервер не оформляет заказ: пользователь открывает ссылку на сайте и проверяет наличие и цену на карточках.

## Аутентификация

Плагин указывает на `https://mcp.vkusvill.ru/mcp` без заголовков. Официальный сервер анонимный: OAuth и PAT не требуются. Ключ в пакет не кладётся: Agent Plugins 1.0 запрещает секреты и подстановку `${VAR}` в `url` и `headers`.

Если клиент не достучится до MCP, это ошибка соединения одного сервера, а не всего плагина: скилл всё равно загружается.

## Ссылки

- [ВкусВилл](https://vkusvill.ru)
- [MCP-сервер ВкусВилл](https://mcp.vkusvill.ru/mcp)
- [Статья ВкусВилл на Хабре](https://habr.com/ru/companies/vkusvill/articles/981866/)
- [Спецификация Agent Plugins](https://agent-plugins.org/specification)
- [Спецификация Agent Skills](https://agentskills.io/specification)
