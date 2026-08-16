---
name: vkusvill
description: Searches VkusVill products, nutrition, discounts, analogs, recipes, and shops, then builds a shareable cart link through this plugin's VkusVill MCP server. Use when the user wants groceries from VkusVill, a shopping list or recipe basket, KBJU/allergens, promo items, store lookup, or a share_basket URL. Trigger on VkusVill, ВкусВилл, grocery cart, состав, КБЖУ, штрихкод.
---

# VkusVill

Use this plugin's MCP tools. Do not run local git, gh, python, or skill scripts. If a needed MCP tool is not connected, say so and stop that path.

The server is anonymous catalog access. It cannot log in, pay, or place an order. The cart tool returns a `https://vkusvill.ru/?share_basket=...` link the user opens on the site to confirm availability and checkout.

Always tell the user that prices, stock, and composition must be checked on the product cards before ordering.

## When to use

- Build a grocery list or cart from a meal, recipe, or shopping request
- Look up composition, calories, KBJU, allergens, or a barcode
- Find promo items, analogs, recipes, or nearby VkusVill shops

## IDs

Search, details, analogs, and discounts return both `id` and `xml_id`.

- `id` — `vkusvill_product_details` and `vkusvill_product_analogs`
- `xml_id` — `vkusvill_cart_link_create` (`products[].xml_id`). Do not send search `id` as `xml_id`

## Tools

### `vkusvill_products_search`

Text search. Page size is fixed at 10; paginate with `page`.

| Argument | Notes |
| --- | --- |
| `q` | Query, 1–255 characters |
| `page` | Default 1 |
| `sort` | `popularity` (default), `rating`, `price_asc`, `price_desc`, `new` |
| `vvonly` | `1` (default) = VkusVill brand only; set `0` unless the user asked for own-brand items |
| `mode` | `short` (default), `full`, `custom` |
| `fields` | For `custom` only: `id`, `xml_id`, `name`, `slug`, `description`, `price`, `unit`, `weight`, `rating`, `url`, `images`, `category`, `properties` |
| `category_id` | From `facets[categories]` in a previous search; `0` means no filter |

For cart building prefer `mode=custom` with `id`, `xml_id`, `name`, `price`, `rating`, `weight`, `unit`, `url`. Responses are text wrapping JSON — parse them.

### `vkusvill_product_details`

Required `id` from search. Use for diet, allergens, calories per 100 g, or when short search is not enough.

### `vkusvill_product_barcode`

Required `barcode`: EAN-13, exactly 13 digits (leading zeros allowed). Use when the user scanned or typed a barcode.

### `vkusvill_product_analogs`

Required `id` from search. Use for replacements, cheaper options, or when the first pick is a poor match.

### `vkusvill_products_discount`

Promo list. There is no text query in the schema.

| Argument | Notes |
| --- | --- |
| `type` | `card` (loyalty, default) or `quantity` (multi-buy) |
| `page` | Default 1; 10 items per page |
| `sort` | `popularity`, `rating`, `price_asc`, `price_desc`, `new`, `name_asc`, `name_desc` |
| `vvonly` | Default `1`; set `0` for all brands |

### `vkusvill_cart_link_create`

Required `products`: `{ xml_id, q }[]`. `q` is quantity, 0.01–40. Schema `maxItems` is 30; the tool description still says 1–20. Stay at 20 when possible. If there are more items, or the call fails, split into several links. Return every `share_basket` URL.

### `vkusvill_recipes`

All listed arguments are required. To discover filters, call with `page=1`, `sort=popularity`, `q=""`, unused integer filters `0`, and `id_exclude_allergens_filter=[]`. Then search with `q` and filter IDs from that first response. Page size is 10.

### `vkusvill_shops`

Shop search: address, coordinates, contacts, hours, features. Call with `page=1` to list region/city/metro/feature filters. Then pass `id_region_filter`, `id_city_filter`, `id_subway_filter`, `id_feature_filter` as needed (`0` = none). Page size is 10.

## Shopping workflow

1. Clarify need, quantities, budget, diet, and allergens. Ask at most two questions if those are missing. Do not invent a store address.
2. Split the request into search queries (ingredients or product names). Search with `vvonly=0` unless the user wants VkusVill brand only.
3. Pick items that match fat/volume/taste/brand constraints. For “cheap” use `sort=price_asc`. For “best rated” use `sort=rating`. For low-calorie or allergen checks, call `vkusvill_product_details` on candidates.
4. Create the cart with `xml_id` + `q`. Give the `share_basket` link immediately.
5. If the user asked for several baskets (cheap / favorite / light), search and link each variant separately.

## Guardrails

- Do not claim checkout, delivery slot, or live stock unless a connected tool actually returned that.
- Do not put secrets into queries.
- Prefer MCP over guessing catalog prices from training data.
