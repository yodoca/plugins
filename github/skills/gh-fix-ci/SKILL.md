---
name: gh-fix-ci
description: Diagnose failing GitHub Actions checks on a pull request using this plugin's GitHub MCP tools. Use when the user asks to inspect failing checks, workflow runs, or CI logs. Ask for owner/repo and PR number when they are missing. If Actions tools are not connected, say CI logs are unavailable.
---

# GitHub Actions CI Fix

## When to use

- Failing GitHub Actions checks on a pull request
- The user asks to debug CI, inspect Actions logs, or plan a fix for a red check

## Instructions

Use GitHub MCP tools from this plugin. Do not run local `gh`, `python scripts/...`, or other CLIs — Yodoca does not execute skill scripts or a GitHub CLI.

## Workflow

1. Resolve the PR from the user request (owner/repo plus PR number or URL). Ask if any of that is missing.
2. Fetch PR metadata with MCP tools.
3. Inspect failing checks.
   - If the connected toolset exposes Actions or check-run tools, list check runs / workflow runs for the PR, then fetch job logs for failures.
   - If those tools are not connected, say that CI logs are unavailable on this MCP toolset and stop the inspection path. Do not invent a CLI fallback.
4. Scope non-GitHub Actions checks. If a check URL is not a GitHub Actions run, label it as external and report the URL only.
5. Summarize failures: check name, run URL if any, and a concise log snippet. Call out missing logs.
6. Propose a focused fix plan tied to the observed root cause. Wait for approval before editing code.
7. After an approved fix, suggest re-running the relevant checks via MCP if that tool exists.

## Guardrails

- Do not imply MCP can read Actions logs unless those tools are actually connected.
- Treat non-GitHub Actions providers as report-only.
- If the failure is clearly unrelated to the described change, say so before proposing code edits.
