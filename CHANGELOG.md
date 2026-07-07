# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Cursor adapter (`.cursor/rules` format) for `init -g` bootstrap.
- Per-agent hook adapters for automatic `/X` triggering (push model).

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

[Unreleased]: https://github.com/victortomaili/skill-cli/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/victortomaili/skill-cli/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/victortomaili/skill-cli/releases/tag/v0.1.0
