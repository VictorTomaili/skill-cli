# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **`skill search` / `skill browse`** — interactive search & multi-install TUI (TTY only). Type a query → browse live `npx skills find` results → mark one or more with `space` → `enter` installs all marked → loops back so you can search again ("research" → pick → "deploy" → pick). `skill install` with no source also opens it on a terminal. Agents/CI (non-TTY) and explicit `skill install <source>` stay fully non-interactive.
- **`@skill`-pinned sources** (`owner/repo@skill`) now install just that one skill instead of the whole repo (`--skill '*'` is dropped when the source is pinned).
- **`skill` (no args) / `skill manager` / `skill ui`** — interactive skill-manager TUI (TTY only). Manage every installed skill from the keyboard: ↑↓ navigate · `space` toggle active in the current project · `d` delete (with confirm) · `enter` view the `SKILL.md` · `q` quit. Agents/CI (non-TTY) never enter it; `skill` with no args on a non-TTY still prints help. Toggle follows the allow/deny model (allow wins; a project deny overrides a global enable).

### Planned
- Cursor adapter (`.cursor/rules` format) for `init -g` bootstrap.
- Per-agent hook adapters for automatic `/X` triggering (push model).

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
