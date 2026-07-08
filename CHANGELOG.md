# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Cursor adapter (`.cursor/rules` format) for `init -g` bootstrap.
- Per-agent hook adapters for automatic `/X` triggering (push model).

## [0.6.8] - 2026-07-08

### Changed
- AGENTS.md + `skill active`: reframed cost/style/speed skills as USER TRADE-OFFS
  the agent must never pre-judge. The agent kept skipping proposals with "not
  relevant to this task"; the new wording forbids deciding a trade-off for the
  user ("not relevant here" = stealing the user's decision). Made the `skill active`
  footer mechanical (LOAD/PROPOSE/SKIP grid) with an explicit callout: "cost/style
  but not relevant here → that is the bug. Ask instead."

## [0.6.7] - 2026-07-08

### Changed
- AGENTS.md START GATE: heavily compressed (605 → ~250 words) and made the
  classification mechanical. cost/style/speed-affecting skills MUST be proposed on
  EVERY task (those axes apply by definition); the rationalizations "not needed for
  this task", "the user didn't request it", and "skip unless needed" are now
  explicitly FORBIDDEN. Also de-hardcoded the caveman example (it overfit the test)
  — the rule is now fully generic.

## [0.6.6] - 2026-07-08

### Changed
- AGENTS.md START GATE: the load/propose/skip decision is now driven by the four
  criteria (correctness / quality / cost / speed), not "propose every ★". A skill
  that affects CORRECTNESS or QUALITY → auto-load; affects COST or SPEED only →
  propose; affects none → skip. Task type still does not filter candidates (a
  cost/style skill is a candidate on every task), and the agent must state each
  decision out loud. `skill active` footer rewritten to match.

## [0.6.5] - 2026-07-08

### Changed
- AGENTS.md START GATE: **ENFORCEMENT** block — for EVERY active skill the agent
  MUST state a decision out loud (LOAD or PROPOSE); staying silent or "not needed
  for this task" is not valid. A ★ default is NEVER silently skipped: style/cost/
  shortcut skills are candidates for every task type, "the user didn't ask" is not a
  reason to stay quiet, and the only valid silence is the user already declining it
  this session. Proposing is proactive — don't wait to be asked.
- `skill active` now prints a bold footer: "For EACH ★ skill above: PROPOSE it now.
  Task type is irrelevant; 'not needed' is not a skip reason."

## [0.6.4] - 2026-07-08

### Added
- AGENTS.md START GATE: a PRIORITIES line — when trading off how to do the work,
  rank CORRECTNESS first, then QUALITY, then COST (cheap / token-efficient), then
  SPEED (fast); never sacrifice correctness or quality for speed or cost.

## [0.6.3] - 2026-07-07

### Changed
- AGENTS.md START GATE: clarified the load-vs-propose line. The agent now AUTO-LOADS
  (silently) any skill needed to do the task at all, OR that makes the work HIGHER
  QUALITY / more correct (domain knowledge, best-practice, standards, a quality
  methodology). It PROPOSES only optional EXPERIENCE changes — response
  style/format/mode, context-cost/token optimization, and optional shortcuts
  (easier/faster, not about correctness). When unsure, propose.

## [0.6.2] - 2026-07-07

### Changed
- AGENTS.md START GATE: stricter, broader PROPOSE rule. The agent now auto-loads
  only skills STRICTLY NECESSARY to attempt the task, and PROPOSES (waits for user
  confirmation) everything else — explicitly including: response STYLE/format/mode
  skills, CONTEXT-COST / token optimizers, ACTIVATE-BEFORE-WORK workflows, and any
  facilitator/accelerator that would make the job EASIER or FASTER. When unsure,
  propose (propose is the safe default; loading is silent).

## [0.6.1] - 2026-07-07

### Changed
- Renamed the agent catalog command `skill defaults` → **`skill active`** (`skill
  status` is an alias; `skill defaults` is kept as a legacy alias so already-bootstrapped
  agents keep working). It now lists ONLY the skills active in the current project
  (defaults + project allow, minus deny) with full descriptions — not every installed
  skill. `skill default <name>` / `skill undefault <name>` (marking) are unchanged.
- AGENTS.md START GATE updated to run `skill active` and scope the catalog to
  active skills.

## [0.6.0] - 2026-07-07

### Changed
- **`skill defaults` is now a description-only catalog.** It lists EVERY installed
  skill (name + full description + triggers; ★ marks defaults) — never the skill
  body. The agent reads the catalog and decides per skill: functional for the task
  → `skill cat <name>`; context-altering (changes HOW the agent responds) → propose
  and wait for the user's confirmation. This follows the existing SKILL.md standard
  — no extra frontmatter field is required or expected on any skill.
- **Context-altering detection is the agent's judgment, from the description.** Any
  skill can be context-altering (including ones installed later); the agent decides
  from the description text, with no hardcoded list. (`skill cat` is unchanged — it
  still loads a full skill on demand.)

### Added
- AGENTS.md START GATE now enforces **"LOADED ≠ LISTED"**: a skill is loaded only
  if the agent ran `skill cat <name>` for it this session — listing/cataloging a
  skill (or its ★ / `active` status) is not loading.

## [0.5.1] - 2026-07-07

### Fixed
- AGENTS.md bootstrap block hardened into hard rules after a live pi-agent test
  surfaced two gaps. **(a) START GATE:** on the first user message, the agent's
  VERY FIRST action — BEFORE ANYTHING ELSE (before thinking, before any tool call)
  — MUST be `skill defaults` + `skill cat <name>` for each, then `skill list`
  (discovery is mandatory, not optional). **(b) Context-altering = PROPOSE-ONLY:**
  `active` / ★-default means *available*, not *applied* — propose ≠ auto-apply,
  and the rule overrides any other skill's "always use" instruction. Also:
  whenever a skill is loaded mid-session, re-evaluate the message and load/propose
  any newly-relevant one.

## [0.5.0] - 2026-07-07

### Added
- AGENTS.md bootstrap block now instructs the agent to (a) **discover & load relevant skills per message** (skills are not in context until loaded — match the message to a skill's triggers/topic, then `skill cat`), and (b) **propose — don't auto-apply — context-altering skills** (those that change HOW the agent responds, e.g. an output-style/mode skill): apply only after the user confirms (an explicit `/X` counts as confirmation).

### Changed
- Manager + `skill list`: clearer activation UI. New **`source`** column shows *why* a skill is/isn't active in the current project — `global` (inherited default), `global·off` (default but denied here), `project` (project allow only), `—` (passive). The label is derived from `active` + `isDefault`, so it can never disagree with the ●/○ marker. The manager now also prints the project path + counts (`installed · active here · global defaults`) and an explicit legend; the `space` (per-project) vs `a` (global default) keys are labelled distinctly.

### Fixed
- `source` label: a global-default skill that is **also** explicitly enabled in the current project now shows `project` (the more-specific source), with ★ still marking its default membership. Previously `isDefault && active` short-circuited to `global`.

## [0.4.0] - 2026-07-07

### Changed (breaking — config format)
- **Unified the "default" and "enabled" concepts into ONE global list.** Previously there were two independent global lists — `enabled_global` (skills active by default in every project) and `defaults_global` (skills auto-loaded on session start, independent of active state). Now there is a single `defaults` list in `config.yaml`: a default skill is BOTH active by default in every project AND auto-loaded on session start. This dissolves the confusion where the manager used a hidden `deny` to turn off a global skill — a default is simply the active-by-default set, and a project refines it with `allow` / `deny`.
  - `skill default <name>` is now always GLOBAL (the `-g` flag is accepted but a no-op). `skill enable -g <name>` and `skill default <name>` now do the same thing; `skill disable -g` / `skill undefault` remove it.
  - The per-project `defaults:` key in `skill.config` is removed — defaults are a global concept only. A project refines the active set with `allow` / `deny` / `inherit` (see Activation).
  - **Automatic migration:** a legacy `config.yaml` with `enabled_global:` and/or `defaults_global:` is folded into `defaults:` (the union of both, deduped) on the next write. No manual steps.
- AGENTS.md bootstrap block: the "Defaults" line now describes the unified model (active by default + auto-load, global).

### Added
- `skill init -g` now bootstraps **pi** too — the AGENTS.md block is injected into `~/.pi/agent/AGENTS.md` (pi's global context file). Claude Code, Codex, Gemini, and pi are now all bootstrapped on a single re-run.

## [0.3.0] - 2026-07-07

### Added
- **`skill search` / `skill browse`** — interactive search & multi-install TUI (TTY only). Type a query → browse live `npx skills find` results → mark one or more with `space` → `enter` installs all marked → loops back so you can search again ("research" → pick → "deploy" → pick). `skill install` with no source also opens it on a terminal. Agents/CI (non-TTY) and explicit `skill install <source>` stay fully non-interactive.
- **`@skill`-pinned sources** (`owner/repo@skill`) now install just that one skill instead of the whole repo (`--skill '*'` is dropped when the source is pinned).
- **`skill` (no args) / `skill manager` / `skill ui`** — interactive skill-manager TUI (TTY only). Manage every installed skill from the keyboard: ↑↓ navigate · `space` toggle active in the current project · `d` delete (with confirm) · `enter` view the `SKILL.md` · `q` quit. Agents/CI (non-TTY) never enter it; `skill` with no args on a non-TTY still prints help. Toggle follows the allow/deny model (allow wins; a project deny overrides a global enable).
- **Default skills — auto-load on session start.** New commands: `skill default <name> [-g]` / `skill undefault <name> [-g]` to mark/unmark, and `skill defaults` to list them (this is the command the agent runs on startup). The AGENTS.md bootstrap block now instructs the agent to run `skill defaults` then `skill cat <name>` for each. Defaults are a flag **independent** of enable/disable (a skill can be a default without being active), stored in `skill.config` `defaults:` (project) and `config.yaml` `defaults_global:` (global). Markable from the CLI, or in the manager via the `a` key (★ marker); `skill list` shows ★ too.

### Fixed
- `skill search` and the manager now exit on `ESC` (previously only Enter / Ctrl-C worked — the prebuilt `@inquirer` prompts ignore ESC). ESC aborts the active prompt via its `AbortSignal`; the terminal/raw-mode is restored on abort. The manager also quits on `ESC` from the main list.
- **225 tests** (unit + CLI), network-free by default.

## [0.2.0] - 2026-07-07

### Added
- `skill remove <name>... [-y]` (aliases `rm`, `uninstall`) — removes skill(s) from the store and cleans up the global enabled list + current project allow-list. Interactive `y/N` confirmation on a TTY (default **N** = keep); non-interactive for agents, CI, and pipes (non-TTY), or when `-y`/`--yes`/`-f`/`--force` is passed. Destination names are canonicalized via the store (case-insensitive; an unknown/`../x` name can't reach the store path). Duplicate and case-variant names are de-duplicated (one removal, accurate count).

## [0.1.1] - 2026-07-07

### Fixed
- `skill trigger <name>` now loads a skill by exact name when no `triggers:` keyword matches. Skills without a `triggers:` field (e.g. description-triggered skills imported from the `skills` / `vercel-labs` ecosystem) were previously unreachable via `trigger`. A passive skill matched by name now shows an enable hint (`skill enable` / `skill cat`) instead of a dead-end "No active skill" message.

## [0.1.0] - 2026-07-07

### Added
- **Central store + activation model** — skills live in `~/.skill-cli/store`;
  agent directories stay clean.
- **Commands:** `init [-g]`, `install`, `update`, `enable [-g]`, `disable [-g]`,
  `list`, `show`, `cat`, `trigger`. Aliases: `ls`, `add`, `info`.
- **Universal install sources** — `owner/repo`, GitHub/GitLab URL, git URL, local
  path, npm package — delegated to `npx skills add` in a temp cwd (agent folders
  untouched).
- **Three-layer activation** — installed → enabled globally → enabled per project,
  with `allow` winning over `deny` and case-insensitive matching throughout.
- **Idempotent `AGENTS.md` bootstrap** — injected into `CLAUDE.md`, `AGENTS.md`,
  `GEMINI.md` behind `BEGIN/END` markers; never duplicates, preserves existing
  content.
- **Pull-based `/X` triggers** — `skill trigger <keyword>` resolves to content
  (single match), candidates (multiple), or info (none).
- **Cross-platform** — Windows (`cmd.exe /c npx`, `CVE-2024-27980` workaround),
  macOS, Linux.
- **`skill.config`** per-project override: `inherit` / `deny` / `allow`.
- **`.source` tracking** so `skill update` can re-fetch and diff (sha256 +
  version compare); exits non-zero on failure.
- **157 tests** (unit + CLI), network-free by default; opt-in `npm run test:e2e`
  for the real `npx` fetch path.

### Security
- `install`/`update` destination names are sanitized (`SAFE_NAME`) — a malicious
  frontmatter `name: ../x` cannot escape the store or `rmSync` outside it.
- `update` case-folds skill names (consistent with all other commands).
- Windows `npx` spawn runs with `shell:false` + an args array and rejects sources
  containing shell metacharacters (`& | < > ^`).

[Unreleased]: https://github.com/victortomaili/skill-cli/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/victortomaili/skill-cli/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/victortomaili/skill-cli/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/victortomaili/skill-cli/releases/tag/v0.1.0
