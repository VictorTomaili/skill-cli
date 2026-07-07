# skill-cli

> One skill store. Clean agent folders. Activate from anywhere.

[![CI](https://github.com/victortomaili/skill-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/victortomaili/skill-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/skill-cli.svg)](https://www.npmjs.com/package/skill-cli)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-green.svg)](https://nodejs.org)
[![tests](https://img.shields.io/badge/tests-157%20passing-brightgreen.svg)](#development)

**skill-cli** is a cross-agent skill manager for AI coding agents (Claude Code,
Codex, Cursor, Gemini, …). Skills live in a single global store — your agent
directories stay **clean** — and you control which skill is active where with one
config file.

- 🗂️ **One canonical store** — `~/.skill-cli/store`. No more copies scattered across `~/.claude`, `~/.codex`, `~/.cursor`, …
- 🧹 **Agent folders untouched** — nothing is written into agent directories.
- 🎛️ **Three-layer activation** — installed → enabled globally → enabled per project. `allow` always wins over `deny`.
- 🔌 **Universal sources** — `owner/repo`, GitHub/GitLab URL, git URL, local path, npm package (via `npx skills`).
- ⚡ **Pull-based** — agents pull skill content into context on demand via `skill trigger /X`. No hooks required.
- 🖥️ **Cross-platform** — Windows, macOS, Linux (handles the Windows `npx` spawn quirk for you).
- 🧪 **Well tested** — 157 unit + CLI tests, network-free by default.

## ⭐ Found this useful?

If skill-cli saves you time, please [give it a star ⭐](https://github.com/victortomaili/skill-cli)
on GitHub — it helps others discover the project and keeps development going. Thank you! 💜

## Installation

```bash
npm install -g skill-cli
```

Requires Node.js 22+.

## Quick start

```bash
# 1) one-time global setup (creates the store + bootstraps detected agents)
skill init -g

# 2) install a skill from any source
skill install owner/repo

# 3) use it — type /<trigger> in your agent, or load directly
skill list
skill cat <name>
```

That's it. Your agent now knows: *when the user types `/X`, run `skill trigger X`*.

## How it works

```
~/.skill-cli/
  store/<skill>/SKILL.md     ← one canonical store (skills live here)
  config.yaml                ← global config (enabled_global)

<project>/skill.config       ← per-project activation (inherit / deny / allow)
~/.claude/CLAUDE.md          ← bootstrap block injected by `skill init -g`
~/.codex/AGENTS.md             (idempotent — preserves your existing content)
~/.gemini/GEMINI.md
```

Agents don't read `skill.config` directly — the CLI does. The agent only needs the
short bootstrap block telling it to run `skill` on `/X`.

## Commands

| Command | Description |
|---|---|
| `skill init -g` | Global setup: create store + inject bootstrap into agent files |
| `skill init` | Create a `skill.config` for the current project |
| `skill install <source>` | Fetch skill(s) to the store (agent dirs untouched) |
| `skill enable <name> [-g]` | Enable in project, or globally with `-g` |
| `skill disable <name> [-g]` | Disable |
| `skill list` | Show installed + active skills (cwd-aware) |
| `skill show <name>` | Skill metadata (path, triggers, version) |
| `skill cat <name>` | Dump skill content into context |
| `skill trigger <keyword>` | `/X` trigger: single→content, multi→candidates, none→info |
| `skill update [name…\|--all]` | Re-fetch from source, update changed skills |

Aliases: `ls` (list), `add` (install), `info` (show).

## Install sources

`install` delegates resolution to `npx skills`, so every format works:

```
owner/repo                                        GitHub shorthand
https://github.com/owner/repo                     full GitHub URL
https://github.com/owner/repo/tree/main/skills/x  path inside a repo
https://gitlab.com/org/repo                       GitLab URL
git@github.com:owner/repo.git                     any git URL
./my-local-skills                                 local path
<npm-package>                                     npm package shipping skills
```

Install runs `npx skills add` in a **temp cwd** so files land in `<tmp>/.claude/skills/`
and are then moved into `~/.skill-cli/store/`. Your real agent directories are
**never** written to.

## Skill format

Faithful to the `SKILL.md` standard (the author decides the structure):

```yaml
---
name: deep-research
description: Deep source-research workflow
version: 1.2.0
triggers: [research, deep-search]   # skill-cli-specific; powers /<trigger>
---
# Your instructions here
```

`triggers` is optional and skill-cli-specific. See [`examples/hello-world/SKILL.md`](examples/hello-world/SKILL.md)
for a minimal, copy-paste template.

## Activation

Three layers, most-specific wins:

1. **installed** — present in the store (passive)
2. **enabled globally** — listed in `config.yaml`; active by default in every project
3. **enabled per project** — in the project's `skill.config` `allow` list

A project `skill.config` overrides the global set. Pure allowlist mode:

```yaml
# <project>/skill.config
inherit: true
deny: ["*"]                    # block every globally-enabled skill in this project
allow: [react-best-practices]  # then open them one by one
```

> `allow` always wins over `deny`, so `deny: ["*"]` + `allow: [X]` = "only X".
> Matching is case-insensitive throughout.

## Bootstrap

`skill init -g` injects a short, idempotent block into each detected agent's global
instruction file (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`):

> When the user types `/X`, run `skill trigger X`. Single match → apply the output;
> multiple → show candidates; load each skill only once per session.

It's wrapped in `<!-- BEGIN skill-cli --> … <!-- END skill-cli -->` markers, never
duplicates, and preserves your existing file content. Re-run `init -g` any time —
it reports `already set up` and rewrites nothing.

**Supported agents:** Claude Code, Codex, Gemini. (Cursor uses `.cursor/rules` with
a different format — adapter planned. See [issue tracker](https://github.com/victortomaili/skill-cli/issues).)

## Cross-platform

Works on Windows, macOS, and Linux. On Windows it spawns `npx` via `cmd.exe /c`
(the Node 20+ `CVE-2024-27980` workaround) with `shell:false` and validates the
source against shell metacharacters, so it's safe by default.

## Development

```bash
git clone https://github.com/victortomaili/skill-cli
cd skill-cli
npm install
npm link            # makes `skill` point at your checkout
npm test            # 157 tests, network-free (~3s)
npm run test:e2e    # opt-in: real npx fetch over the network
```

Tests never touch your real `~` — they use an isolated `SKILL_CLI_HOME`. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for the project structure, how to add a command,
and the PR checklist.

## Contributing

Contributions are welcome! 💜 Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and
follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

- 🐛 [Report a bug](https://github.com/victortomaili/skill-cli/issues/new?template=bug_report.yml)
- ✨ [Request a feature](https://github.com/victortomaili/skill-cli/issues/new?template=feature_request.yml)
- 🔒 Found a security issue? See [SECURITY.md](./SECURITY.md) — report it privately, not as a public issue.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT](./LICENSE) © skill-cli contributors
