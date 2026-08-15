---
name: gh-publish
description: Open or update a draft GitHub pull request for an existing remote branch through this plugin's GitHub MCP tools. Use when the user wants a PR created or updated and already has a branch on GitHub. Ask for owner/repo, head branch, and base when they are missing. Do not commit or push local files.
---

# GitHub Publish Changes

## When to use

- The user wants a draft (or ready) pull request for a branch that already exists on GitHub
- The user asks to open or update a PR via GitHub MCP

## Instructions

Use GitHub MCP tools from this plugin to create or update the pull request. Do not run local `git` or `gh`. This skill does not commit, stage, or push local files — that is out of scope on Yodoca.

## Prerequisites

- `owner/repo`
- `head` branch that already exists on the remote
- `base` branch (user request, or the repository default branch from MCP)

Ask for any of these that are missing. If the branch is not on GitHub yet, stop and explain that local commit/push is not available through this plugin.

## Naming

- PR title: terse summary of the change
- Default to a **draft** PR unless the user explicitly wants ready-for-review

## Workflow

1. Confirm owner/repo, head, and base with MCP repository metadata.
2. Check whether a PR already exists for that head with MCP. If it does, update title/body when asked instead of opening a duplicate.
3. Open a draft PR with MCP when none exists. Include a markdown body covering:
   - what changed
   - why it changed
   - user or developer impact
   - root cause when this is a fix
   - how it was validated, if the user said
4. If MCP cannot create the PR (missing tool, fork/cross-repo head, permissions), explain the blocker. Do not fall back to `gh pr create`.
5. Summarize the PR URL, head, base, and draft vs ready state.

## Guardrails

- Never invent a local checkout or run `git push`.
- Never open a non-draft PR unless the user asked for it.
- If the repository or head branch cannot be identified through MCP plus the user request, stop.
