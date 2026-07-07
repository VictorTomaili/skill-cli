# skill-cli

Cross-agent **skill manager**. Skills live in a single global store; each agent's
own folder (`~/.claude`, `~/.codex`, …) stays **clean**. Activation is managed from
one place (`skill.config`); bootstrap happens via `AGENTS.md`.

## Motivation

Every agent has its own skills folder, every project has its own skills folder.
Symlink-based updates technically work, but don't *feel* manageable — which skill,
which version, active where is impossible to track. skill-cli fixes this with a
**central store + activation** model.

## Model

```
~/.skill-cli/
  store/<skill>/SKILL.md     ← ONE canonical store (everything lives here)
  config.yaml                ← global: enabled_global, default_agents, store
  share/                     ← shared templates

<project>/skill.config       ← activation: inherit / deny / allow (agent does NOT read this; CLI does)
<agent-home>/CLAUDE.md etc.  ← instruction block injected by `skill init -g`
```

Pull-based: when an agent needs a skill it runs the `skill` command and pulls the
output into context. No hooks (for now) — the `AGENTS.md` instruction is enough.

## Activation (three layers)

1. **installed** — present in `~/.skill-cli/store` (passive)
2. **enabled_global** — in `config.yaml`; active by default in every project
3. **enabled_project** — in `skill.config` `allow` list; active only in that project

A project's `skill.config` overrides global. Pure allowlist:

```yaml
# <project>/skill.config
inherit: true
deny: ["*"]                    # block every globally-enabled skill in this project
allow: [react-best-practices]  # then open them one by one
```

> A skill being installed globally does NOT mean it's active in a project.
> `allow` always wins over `deny`, so `deny: ["*"]` + `allow: [X]` = "only X".

## Commands

```
skill init [-g]              # -g: global setup (store + AGENTS.md injection)
skill install <source>       # fetch to store via npx skills (agent dirs untouched)
skill enable <name> [-g]     # enable in project, or globally (-g)
skill disable <name> [-g]
skill list                   # installed + active skills (cwd-aware)
skill show <name>            # metadata + path + triggers
skill cat <name>             # dump content to context
skill trigger <keyword>      # /X trigger: single→content, multi→candidates, none→404
skill update [name|--all]    # re-fetch from source, update changed skills
```

## Install sources

`install` delegates source resolution to `npx skills`, so every format works:

```
owner/repo                           GitHub shorthand
https://github.com/owner/repo        full GitHub URL
https://github.com/owner/repo/tree/main/skills/<name>   path inside a repo
https://gitlab.com/org/repo          GitLab URL
git@github.com:owner/repo.git        any git URL
./my-local-skills                    local path
<npm-package>                        npm package shipping skills
```

Install runs `npx skills add` in a **temp cwd** so files land in `<tmp>/.claude/skills/`
and are then moved into `~/.skill-cli/store/`. Your real agent directories are never
written to.

## Skill format

Faithful to the existing `SKILL.md` standard (the skill author decides the structure).
Frontmatter:

```yaml
---
name: deep-research
description: Deep source-research workflow
version: 1.2.0
triggers: [research, deep-search]   # skill-cli-specific; npx skills ignores it
---
```

`triggers` is optional; matched by `skill trigger /research`.

## Bootstrap

`skill init -g` injects an idempotent block into every detected agent's global
instruction file (CLAUDE.md, AGENTS.md, GEMINI.md):

> When the user types `/X`, run `skill trigger X`. Single match → apply,
> multiple → show candidates, load each skill only once per session.

## Test (safe — never touches the real `~`)

```bash
SKILL_CLI_HOME=/tmp/sktest node src/cli.js init -g
SKILL_CLI_HOME=/tmp/sktest node src/cli.js list
```

## Status (0.1.0)

Working: `init`, `install`, `update`, `list`, `show`, `cat`, `trigger`, `enable`, `disable`.
Planned: per-agent hook adapters for auto-triggering on `/X`.
