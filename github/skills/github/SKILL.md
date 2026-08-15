---
name: github
description: Triage GitHub repositories, issues, and pull requests through this plugin's GitHub MCP server. Use when the user asks for general GitHub help, PR or issue summaries, or repository context before a narrower GitHub workflow. Ask for owner/repo (and issue or PR number) when they are not in the request.
---

# GitHub

## When to use

- General GitHub help, PR or issue summaries, or repository orientation
- The user has not yet named a specialist workflow (review comments, CI, or opening a PR)

## Instructions

Use this skill as the umbrella entrypoint for general GitHub work. Prefer the GitHub MCP tools from this plugin. Do not run local `git`, `gh`, or skill scripts — Yodoca does not execute them.

Identify the target from the user request (`owner/repo`, issue number, PR number or URL). If any of that is missing, ask. Do not invent a repository from a local checkout.

Once the intent is clear, route to a specialist skill and stop broad triage:

- Unresolved review threads or inline comments → `gh-address-comments`
- Failing GitHub Actions / PR checks → `gh-fix-ci`
- Open or update a draft PR for an existing remote branch → `gh-publish`

## MCP-first responsibilities

Handle these with GitHub MCP when the request does not need a specialist skill:

- repository orientation once owner/repo (and optional issue or PR) is known
- recent PR or issue triage
- PR metadata summaries
- PR patch inspection
- PR comments, labels, and reactions
- issue lookup and summarization

If a needed MCP tool is not connected, say so and stop that path instead of falling back to a CLI.

## Guardrails

- Ask for the repository instead of assuming one.
- Keep MCP reads scoped to the named repo, issue, or PR.
- Do not claim Actions log access unless the connected toolset actually exposes those tools (then use `gh-fix-ci`).
