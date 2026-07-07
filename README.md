# skill-cli

> One skill store. Clean agent folders. Activate from anywhere.

[![CI](https://github.com/victortomaili/skill-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/victortomaili/skill-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@victortomaili/skill-cli.svg)](https://www.npmjs.com/package/@victortomaili/skill-cli)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-green.svg)](https://nodejs.org)
[![tests](https://img.shields.io/badge/tests-225%20passing-brightgreen.svg)](#development)

**skill-cli** is a cross-agent skill manager for AI coding agents (Claude Code,
Codex, Cursor, Gemini, …). Skills live in a single global store — your agent
directories stay **clean** — and you control which skill is active where with one
config file.

- 🗂️ **One canonical store** — `~/.skill-cli/store`. No more copies scattered across `~/.claude`, `~/.codex`, `~/.cursor`, …
- 🧹 **Agent folders untouched** — nothing is written into agent directories.
- 🎛️ **Three-layer activation** — installed → enabled globally → enabled per project. `allow` always wins over `deny`.
- 🔌 **Universal sources** — `owner/repo`, GitHub/GitLab URL, git URL, local path, npm package (via `npx skills`).
- ⚡ **Pull-based** — agents pull skill content into context on demand via `skill trigger /X`. No hooks required.
- 🔍 **Interactive TUIs** — `skill search` to discover & multi-install from the skills registry; `skill` (no args) to manage every installed skill with the keyboard. TTY-only; agents & CI stay non-interactive.
- ⭐ **Default skills** — one global list: active by default in every project AND auto-loaded on session start.
- 🖥️ **Cross-platform** — Windows, macOS, Linux (handles the Windows `npx` spawn quirk for you).
- 🧪 **Well tested** — 225 unit + CLI tests, network-free by default.

## ⭐ Found this useful?

If skill-cli saves you time, please [give it a star ⭐](https://github.com/victortomaili/skill-cli)
on GitHub — it helps others discover the project and keeps development going. Thank you! 💜

## Installation

```bash
npm install -g @victortomaili/skill-cli
```

Requires Node.js 22+.

## Quick start

```bash
# 1) one-time global setup (creates the store + bootstraps detected agents)
skill init -g

# 2) install a skill from any source (or `skill search` to browse interactively)
skill install owner/repo

# 3) manage everything with the keyboard (terminal only)
skill              # ↑↓ move · space toggle · a default · d delete · enter view
skill list
skill cat <name>
```

That's it. Your agent now knows: *when the user types `/X`, run `skill trigger X`*.

## How it works

```
~/.skill-cli/
  store/<skill>/SKILL.md     ← one canonical store (skills live here)
  config.yaml                ← global defaults (active by default + auto-load)

<project>/skill.config       ← per-project overrides (inherit / deny / allow)
~/.claude/CLAUDE.md          ← bootstrap block injected by `skill init -g`
~/.codex/AGENTS.md             (idempotent — preserves your existing content)
~/.gemini/GEMINI.md
~/.pi/agent/AGENTS.md
```

Agents don't read `skill.config` directly — the CLI does. The agent only needs the
short bootstrap block telling it to run `skill` on `/X`.

## Commands

| Command | Description |
|---|---|
| `skill init -g` | Global setup: create store + inject bootstrap into agent files |
| `skill init` | Create a `skill.config` for the current project |
| `skill install <source>` | Fetch skill(s) to the store (agent dirs untouched) |
| `skill search` | Interactive search & multi-install from the skills registry (TTY) |
| `skill` / `skill manager` | Interactive manager: toggle, default, delete, view (TTY) |
| `skill enable <name> [-g]` | Allow in project, or global default with `-g` |
| `skill disable <name> [-g]` | Deny in project, or remove global default with `-g` |
| `skill default <name>` | Mark a default skill (global: active + auto-load) |
| `skill undefault <name>` | Remove the default flag |
| `skill defaults` | List default skills (the command your agent runs on start) |
| `skill list` | Show installed + active skills (cwd-aware, ★ = default) |
| `skill show <name>` | Skill metadata (path, triggers, version) |
| `skill cat <name>` | Dump skill content into context |
| `skill trigger <keyword\|name>` | `/X` trigger or skill name → content (single), candidates (multi) |
| `skill update [name…\|--all]` | Re-fetch from source, update changed skills |
| `skill remove <name> [-y]` | Remove from store (prompts on TTY; agents / CI / `-y` skip) |

Aliases: `ls` (list), `add` (install), `info` (show), `rm`/`uninstall` (remove), `browse` (search), `ui` (manager), `def` (default), `undef` (undefault).

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

One global concept, refined per project:

1. **installed** — present in the store (passive)
2. **default (global)** — listed in `config.yaml` `defaults:`; **active by default in every project** and **auto-loaded on agent session start**. Mark one with `skill default <name>` (or `skill enable -g`).
3. **per-project override** — a project's `skill.config` refines the set:
   - `allow` — activate an otherwise-passive skill **in this project only**
   - `deny` — turn off a default skill **in this project only**
   - `inherit: false` — ignore global defaults entirely (only `allow` applies)

A project with **no `skill.config`** inherits the global defaults (all active). Pure
allowlist mode in a single project:

```yaml
# <project>/skill.config
inherit: false                 # ignore global defaults in this project
allow: [react-best-practices]  # only this skill is active here
```

> `allow` always wins over `deny`, so with `inherit: true` you can also write
> `deny: ["*"]` + `allow: [X]` = "only X here". Matching is case-insensitive throughout.

## Interactive mode (terminal only)

When run in a real terminal, skill-cli offers two keyboard UIs. **Agents and CI
never enter them** (a non-TTY stdin is detected) — they use the plain commands.

### `skill` — manage installed skills

Opens a full-screen manager over your store:

| Key | Action |
|---|---|
| `↑` / `↓` | move |
| `space` | toggle active in the current project |
| `a` | toggle the global default (active + auto-load) |
| `d` | delete (asks `y/N`) |
| `enter` | view the `SKILL.md` |
| `q` / `esc` | quit |

### `skill search` — discover & install

Type a query → browse live results from the [skills registry](https://skills.sh)
(`npx skills find`) → mark one or more with `space` → `enter` installs all marked
→ loops back so you can search again. `esc` or an empty query quits. `skill install`
with no source also opens it.

## Default skills

A **default** is a skill that is **active by default in every project** AND
**auto-loaded on agent session start** — one unified global list in `config.yaml`
(`defaults:`). Mark one with `skill default <name>`, remove with
`skill undefault <name>`, list them with `skill defaults`. The AGENTS.md bootstrap
block tells your agent to run `skill defaults` on start, then `skill cat <name>`
for each.

Defaults are a **global** concept (never per-project). A project can still turn a
default off locally with `skill disable <name>` (a project `deny`), or activate a
non-default locally with `skill enable <name>` (a project `allow`) — see
[Activation](#activation). In the interactive manager, `a` toggles the global
default; `space` toggles the per-project override.

## Bootstrap

`skill init -g` injects a short, idempotent block into each detected agent's global
instruction file (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`):

> **START GATE:** on the first user message, your VERY FIRST action — BEFORE
> ANYTHING ELSE (before thinking, before any tool call) — is `skill defaults`, the
> skill **catalog** (every skill's name + full description; never the body). Read
> it and decide per skill from its description: **functional** for the task → load
> it (`skill cat <name>`); **context-altering** (changes HOW you respond —
> style/mode) → **propose**, apply only after the user confirms (`/X` = confirm).
> **LOADED ≠ LISTED**: a skill is loaded only if you `cat`-ed it this session —
> listing it (or its ★ / `active` status) is not loading. Any skill can be
> context-altering; the agent judges from the description (no flag, no fixed list).
> `/X` → `skill trigger X`.

It's wrapped in `<!-- BEGIN skill-cli --> … <!-- END skill-cli -->` markers, never
duplicates, and preserves your existing file content. Re-run `init -g` any time —
it reports `already set up` and rewrites nothing.

**Supported agents:** Claude Code, Codex, Gemini, and pi. (Cursor uses `.cursor/rules` with
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
npm test            # 225 tests, network-free (~3s)
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
