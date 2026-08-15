#!/usr/bin/env python3
"""Validate a Yodoca plugin package against Agent Plugins 1.0.0 constraints.

Equivalent to validate-plugin.js. Agents should run exactly one of the two.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"
MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json"
PLUGIN_NAME_RE = re.compile(r"^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$")
SKILL_NAME_RE = re.compile(r"^(?!.*--)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")
PLUGIN_FIELDS = {
    "$schema",
    "name",
    "version",
    "description",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
    "extensions",
}
AUTHOR_FIELDS = {"name", "email", "url"}
SECRET_HINT = re.compile(
    r"(api[_-]?key|secret|password|passwd|token|bearer\s+[a-z0-9._\-]+|"
    r"sk-[a-z0-9]+|ghp_[a-z0-9]+)",
    re.IGNORECASE,
)
PLACEHOLDER_RE = re.compile(r"\$\{[^}]+\}")
CWD_RE = re.compile(r"^(?:\./|\$\{PLUGIN_ROOT\}(?:/|$)|\$\{PLUGIN_DATA\}(?:/|$))")


class Reporter:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def load_json(path: Path, reporter: Reporter) -> dict | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        reporter.error(f"missing file: {path.as_posix()}")
        return None
    except json.JSONDecodeError as exc:
        reporter.error(f"{path.as_posix()}: invalid JSON ({exc})")
        return None
    if not isinstance(data, dict):
        reporter.error(f"{path.as_posix()}: top-level value must be an object")
        return None
    return data


def parse_frontmatter(text: str) -> dict[str, str] | None:
    if not text.startswith("---"):
        return None
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None
    data: dict[str, str] = {}
    for raw in parts[1].splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data


def is_secret_value(value: str) -> bool:
    if PLACEHOLDER_RE.search(value):
        return True
    return bool(SECRET_HINT.search(value))


def validate_plugin_json(plugin_dir: Path, reporter: Reporter) -> str | None:
    path = plugin_dir / "plugin.json"
    data = load_json(path, reporter)
    if data is None:
        return None

    extra = sorted(set(data) - PLUGIN_FIELDS)
    if extra:
        reporter.error(f"plugin.json: unknown top-level fields: {', '.join(extra)}")

    if data.get("$schema") != PLUGIN_SCHEMA:
        reporter.error(f"plugin.json: $schema must be {PLUGIN_SCHEMA}")

    name = data.get("name")
    if not isinstance(name, str) or not (1 <= len(name) <= 64) or not PLUGIN_NAME_RE.match(name):
        reporter.error("plugin.json: invalid name (1-64 chars, a-z0-9.-, no -- or ..)")
        name = None
    elif name != plugin_dir.name:
        reporter.error(
            f"plugin.json name {name!r} must equal directory name {plugin_dir.name!r}"
        )

    for field in ("version", "description", "homepage", "repository", "license"):
        if field in data and not isinstance(data[field], str):
            reporter.error(f"plugin.json: {field} must be a string")

    if "author" in data:
        author = data["author"]
        if not isinstance(author, dict):
            reporter.error("plugin.json: author must be an object")
        else:
            extra_author = sorted(set(author) - AUTHOR_FIELDS)
            if extra_author:
                reporter.error(
                    f"plugin.json: author has unknown fields: {', '.join(extra_author)}"
                )
            for key, value in author.items():
                if not isinstance(value, str):
                    reporter.error(f"plugin.json: author.{key} must be a string")

    if "keywords" in data:
        keywords = data["keywords"]
        if not isinstance(keywords, list) or any(not isinstance(item, str) for item in keywords):
            reporter.error("plugin.json: keywords must be an array of strings")

    if "extensions" in data:
        extensions = data["extensions"]
        if not isinstance(extensions, dict):
            reporter.error("plugin.json: extensions must be an object")
        else:
            for key, value in extensions.items():
                if not isinstance(value, dict):
                    reporter.error(f"plugin.json: extensions.{key} must be an object")

    return name


def validate_skills(plugin_dir: Path, reporter: Reporter) -> list[str]:
    skills_dir = plugin_dir / "skills"
    found: list[str] = []
    if not skills_dir.exists():
        return found
    if not skills_dir.is_dir():
        reporter.error("skills exists but is not a directory")
        return found

    for child in sorted(skills_dir.iterdir()):
        if not child.is_dir():
            reporter.warn(f"skills/: ignoring non-directory {child.name}")
            continue
        skill_md = child / "SKILL.md"
        if not skill_md.is_file():
            reporter.error(f"skills/{child.name}/: missing SKILL.md")
            continue
        text = skill_md.read_text(encoding="utf-8")
        frontmatter = parse_frontmatter(text)
        if frontmatter is None:
            reporter.error(f"skills/{child.name}/SKILL.md: missing YAML frontmatter")
            continue
        name = frontmatter.get("name", "")
        description = frontmatter.get("description", "")
        if not SKILL_NAME_RE.match(name) or not (1 <= len(name) <= 64):
            reporter.error(f"skills/{child.name}/SKILL.md: invalid name {name!r}")
        elif name != child.name:
            reporter.error(
                f"skills/{child.name}/SKILL.md: name {name!r} must equal directory name"
            )
        if not description or len(description) > 1024:
            reporter.error(
                f"skills/{child.name}/SKILL.md: description must be 1-1024 characters"
            )
        found.append(name or child.name)
    return found


def validate_stdio(server_id: str, server: dict, reporter: Reporter) -> None:
    command = server.get("command")
    if not isinstance(command, str) or not command:
        reporter.error(f"mcp.json {server_id}: stdio command must be a non-empty string")
    elif " " in command.strip():
        reporter.error(f"mcp.json {server_id}: command must be one executable token")
    elif PLACEHOLDER_RE.search(command):
        reporter.error(f"mcp.json {server_id}: command must not contain placeholders")
    elif "/" in command.replace("\\", "/") and not command.startswith("./"):
        reporter.error(f"mcp.json {server_id}: package command must start with ./")
    elif command.startswith("../") or "/../" in command:
        reporter.error(f"mcp.json {server_id}: command escapes the plugin root")

    extra = sorted(set(server) - {"type", "command", "args", "env", "cwd"})
    if extra:
        reporter.error(f"mcp.json {server_id}: unknown stdio fields: {', '.join(extra)}")

    if "args" in server:
        args = server["args"]
        if not isinstance(args, list) or any(not isinstance(item, str) for item in args):
            reporter.error(f"mcp.json {server_id}: args must be an array of strings")

    if "env" in server:
        env = server["env"]
        if not isinstance(env, dict) or any(not isinstance(v, str) for v in env.values()):
            reporter.error(f"mcp.json {server_id}: env must be an object of strings")
        else:
            for key in ("PLUGIN_ROOT", "PLUGIN_DATA"):
                if key in env:
                    reporter.error(f"mcp.json {server_id}: env must not set {key}")

    if "cwd" in server:
        cwd = server["cwd"]
        if not isinstance(cwd, str) or not CWD_RE.match(cwd):
            reporter.error(
                f"mcp.json {server_id}: cwd must start with ./, ${{PLUGIN_ROOT}}, or ${{PLUGIN_DATA}}"
            )
        elif ".." in cwd:
            reporter.error(f"mcp.json {server_id}: cwd must stay inside the plugin or PLUGIN_DATA")


def validate_remote(server_id: str, server: dict, reporter: Reporter) -> None:
    extra = sorted(set(server) - {"type", "url", "headers"})
    if extra:
        reporter.error(f"mcp.json {server_id}: unknown remote fields: {', '.join(extra)}")

    url = server.get("url")
    if not isinstance(url, str) or not url:
        reporter.error(f"mcp.json {server_id}: url must be a non-empty string")
        return
    if PLACEHOLDER_RE.search(url):
        reporter.error(f"mcp.json {server_id}: url must not contain placeholders")
    if "://" not in url or url.split("://", 1)[0] not in {"http", "https"}:
        reporter.error(f"mcp.json {server_id}: url must be an absolute http(s) URL")
    if "@" in url.split("://", 1)[-1].split("/", 1)[0]:
        reporter.error(f"mcp.json {server_id}: url must not include userinfo")
    if "#" in url:
        reporter.error(f"mcp.json {server_id}: url must not include a fragment")
    host = url.split("://", 1)[-1].split("/", 1)[0].split(":")[0].lower()
    loopback = host in {"localhost", "127.0.0.1", "::1"}
    if url.startswith("http://") and not loopback:
        reporter.error(f"mcp.json {server_id}: non-loopback url must use https")

    headers = server.get("headers", {})
    if "headers" in server and not isinstance(headers, dict):
        reporter.error(f"mcp.json {server_id}: headers must be an object")
        return
    if isinstance(headers, dict):
        for key, value in headers.items():
            if not isinstance(value, str):
                reporter.error(f"mcp.json {server_id}: header {key} must be a string")
            elif is_secret_value(value):
                reporter.error(
                    f"mcp.json {server_id}: header {key} looks like a secret or placeholder"
                )


def validate_mcp(plugin_dir: Path, reporter: Reporter) -> list[str]:
    path = plugin_dir / "mcp.json"
    if not path.exists():
        return []
    if not path.is_file():
        reporter.error("mcp.json exists but is not a file")
        return []

    data = load_json(path, reporter)
    if data is None:
        return []

    extra = sorted(set(data) - {"$schema", "mcpServers"})
    if extra:
        reporter.error(f"mcp.json: unknown top-level fields: {', '.join(extra)}")
    if data.get("$schema") != MCP_SCHEMA:
        reporter.error(f"mcp.json: $schema must be {MCP_SCHEMA}")

    servers = data.get("mcpServers")
    if not isinstance(servers, dict):
        reporter.error("mcp.json: mcpServers must be an object")
        return []

    found: list[str] = []
    for server_id, server in servers.items():
        found.append(server_id)
        if not isinstance(server, dict):
            reporter.error(f"mcp.json {server_id}: server config must be an object")
            continue
        transport = server.get("type")
        if transport == "stdio":
            validate_stdio(server_id, server, reporter)
        elif transport in {"streamable-http", "sse"}:
            if transport == "sse":
                reporter.warn(f"mcp.json {server_id}: sse is deprecated; prefer streamable-http")
            validate_remote(server_id, server, reporter)
        else:
            reporter.error(f"mcp.json {server_id}: type must be stdio, streamable-http, or sse")
    return found


def validate_readme(plugin_dir: Path, reporter: Reporter) -> None:
    readme = plugin_dir / "README.md"
    if not readme.is_file():
        reporter.error("missing README.md")


def validate_catalog(plugin_name: str, catalog: Path, reporter: Reporter) -> None:
    if not catalog.is_file():
        reporter.error(f"catalog file not found: {catalog.as_posix()}")
        return
    text = catalog.read_text(encoding="utf-8")
    if f"](./{plugin_name})" not in text and f"](./{plugin_name}/)" not in text:
        reporter.error(f"{catalog.as_posix()}: missing catalog row for {plugin_name}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plugin_dir", type=Path, help="Path to the plugin package directory")
    parser.add_argument(
        "--catalog",
        type=Path,
        default=None,
        help="Path to repo README.md (default: <plugin-dir>/../README.md)",
    )
    args = parser.parse_args()

    plugin_dir = args.plugin_dir.resolve()
    reporter = Reporter()

    if not plugin_dir.is_dir():
        print(f"error: {plugin_dir.as_posix()} is not a directory", file=sys.stderr)
        return 2

    name = validate_plugin_json(plugin_dir, reporter)
    skills = validate_skills(plugin_dir, reporter)
    servers = validate_mcp(plugin_dir, reporter)
    validate_readme(plugin_dir, reporter)

    if not skills and not servers:
        reporter.error("plugin has neither skills nor MCP servers")

    catalog = args.catalog or plugin_dir.parent / "README.md"
    if name:
        validate_catalog(name, catalog, reporter)

    for warning in reporter.warnings:
        print(f"warning: {warning}")
    for error in reporter.errors:
        print(f"error: {error}")

    if reporter.errors:
        print(f"FAIL {plugin_dir.name}: {len(reporter.errors)} error(s)")
        return 1

    print(
        f"OK {plugin_dir.name}: {len(skills)} skill(s), {len(servers)} MCP server(s)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
