---
name: gh-address-comments
description: Address actionable GitHub pull request review feedback using this plugin's GitHub MCP tools. Use when the user wants to inspect review comments or requested changes on a PR, then implement selected fixes. Ask for owner/repo and PR number when they are missing.
---

# GitHub PR Comment Handler

## When to use

- Unresolved review comments, requested changes, or inline review notes on a PR
- The user wants to inspect feedback and then implement selected fixes

## Instructions

Use GitHub MCP tools from this plugin for PR metadata, patch context, and comments. Do not run local `git`, `gh`, GraphQL via CLI, or skill scripts.

## Workflow

1. Resolve the PR from the user request (owner/repo plus PR number or URL). Ask if any of that is missing.
2. Fetch PR metadata and the patch with MCP tools.
3. List review and issue comments with MCP tools.
   - If the toolset exposes review threads with resolution state (`isResolved`, outdated, file/line anchors), use that.
   - If comments arrive as a flat list without thread state, work with that list and say that resolved vs unresolved threads cannot be distinguished.
4. Cluster actionable comments by file or behavior. Separate change requests from informational notes, approvals, and duplicates.
5. Confirm scope before editing.
   - Present numbered actionable items with a one-line summary.
   - If the user did not ask to fix everything, ask which items to address.
6. Implement only the selected fixes, keeping each change traceable to the comment it addresses. If a comment asks for explanation rather than code, draft a reply instead of forcing a patch.
7. Summarize which items were addressed, which were left open, and any remaining uncertainty from missing thread metadata.

## Guardrails

- Do not invent thread resolution state that MCP did not return.
- Do not fall back to `gh api graphql` or bundled Python scripts.
- Stop the comment-read path if no comment tools are connected, and say so.
