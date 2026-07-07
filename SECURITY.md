# Security Policy

## Supported versions

skill-cli is pre-1.0 and actively developed. Security fixes are applied to the
latest `main` and the most recent release only.

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | ✅ latest release   |
| < 0.1   | ❌ not supported    |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Instead, report vulnerabilities privately:

- 📧 Email: **victor@tomaili.com**
- Or use [GitHub's private vulnerability reporting](https://github.com/victortomaili/skill-cli/security/advisories/new)

Please include:

1. A description of the issue and its impact.
2. Steps to reproduce (a minimal command + input is ideal).
3. The affected version (`skill --version`) and your OS / Node version.
4. Any suggested fix, if you have one.

## Response timeline

- **Acknowledgement:** within 48 hours.
- **Initial assessment:** within 5 business days.
- **Fix or mitigation:** targeted for the next patch release, depending on severity.

We will credit reporters in the release/changelog unless you prefer to remain
anonymous.

## Scope

skill-cli fetches skill packages from arbitrary sources (`install`), writes to
`~/.skill-cli`, and injects an instruction block into your agent config files.
We take the following especially seriously:

- **Path traversal** during `install`/`update` (writing outside the store).
- **Arbitrary code execution** via the `npx skills add` spawn, especially on
  Windows (`cmd.exe` shell-metacharacter handling).
- **Corruption or data loss** in your agent instruction files
  (`CLAUDE.md`/`AGENTS.md`/`GEMINI.md`) during `init -g`.

Out of scope (by design / delegated):

- The contents of third-party skills fetched via `npx skills` — review what you
  install, just like any package. skill-cli installs into an isolated store and
  never copies into agent directories.
- Vulnerabilities in `npx skills` itself — report those upstream.

## Hardening already in place

- `install`/`update` dest names are sanitized (`SAFE_NAME`) — a malicious
  frontmatter `name: ../x` can't escape the store.
- `update` case-folds skill names, so an unknown name can't reach a store path.
- The Windows `npx` spawn uses `shell:false` with an args array and rejects
  sources containing shell metacharacters (`& | < > ^`).
- `init -g` injection is wrapped in idempotent markers and preserves existing
  file content.
