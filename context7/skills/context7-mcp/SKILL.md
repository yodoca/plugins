---
name: context7-mcp
description: Fetches current, version-specific library documentation and code examples through the Context7 MCP server. Use whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service — including API syntax, configuration, setup, version migration, CLI usage, and library-specific debugging. Use when generating code that calls a third-party library, and when the user names a version such as Next.js 15 or React 19. Use even for well-known libraries like React, Vue, Next.js, Prisma, Supabase, Express, Tailwind, Django, and Spring Boot, because training data may not reflect recent changes. Prefer this over web search for library documentation. Do not use for refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts, or when the user has already supplied the relevant documentation.
---

When the user asks about libraries, frameworks, or needs code examples, fetch current documentation from Context7 instead of relying on training data.

## When to Use This Skill

Activate this skill when the user:

- Asks setup or configuration questions ("How do I configure Next.js middleware?")
- Requests code involving libraries ("Write a Prisma query for...")
- Needs API references ("What are the Supabase auth methods?")
- Mentions a specific framework (React, Vue, Svelte, Express, Tailwind, and similar)
- Names a library version ("Next.js 15", "React 19")

Do not use Context7 for language builtins, general programming advice, or when the user already provided the relevant docs.

## How to Fetch Documentation

### Step 1: Resolve the Library ID

If the user already gave a Context7 ID in the form `/org/project` or `/org/project/version`, skip this step and use that ID.

Otherwise call `resolve-library-id` with:

- `libraryName`: the library name extracted from the question
- `query`: what to look up in that library's documentation (improves ranking)

Do not put secrets into `query`. Call `resolve-library-id` at most three times per question.

### Step 2: Select the Best Match

From the results, prefer:

- Exact or closest name match
- Official/primary packages over community forks
- Higher benchmark scores (better documentation quality)
- A version-specific ID when the user named a version

### Step 3: Fetch the Documentation

Call `query-docs` with:

- `libraryId`: the selected Context7 ID (for example `/vercel/next.js` or `/vercel/next.js/v15.1.8`)
- `query`: a single concept to look up

If the question covers several distinct concepts (routing, auth, and caching), resolve the library once, then make a separate `query-docs` call per concept. Combined queries dilute ranking. Keep concepts in one call only when the question is about how they interact.

### Step 4: Use the Documentation

Answer from the fetched docs:

- Use current APIs and examples from the result
- Include relevant code samples
- Cite the library version when it matters

## Guidelines

- Keep each `query-docs` call to one concept.
- Prefer official sources when several libraries match.
- Pin the version in the library ID when the user asked for a specific release.
