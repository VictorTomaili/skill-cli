# Contributing to skill-cli

Thanks for your interest in contributing! 💜 This project is community-driven and
all contributions — bug reports, fixes, features, docs, skills — are welcome.

> Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) first. By participating
> you agree to uphold it.

## Quick links

- 🐛 [Report a bug](https://github.com/victortomaili/skill-cli/issues/new?template=bug_report.yml)
- ✨ [Request a feature](https://github.com/victortomaili/skill-cli/issues/new?template=feature_request.yml)
- 🔒 Security issue → see [SECURITY.md](./SECURITY.md) (report privately)

## Development setup

```bash
git clone https://github.com/victortomaili/skill-cli
cd skill-cli
npm install
npm link            # makes the `skill` command point at your checkout
npm test            # 157 tests, network-free (~3s)
```

Requires Node.js 22+. Tests never touch your real home directory — they run against
an isolated `SKILL_CLI_HOME`, so you can experiment freely.

## Project structure

```
src/
  cli.js                 entry point: arg parsing + command dispatch
  commands/              one file per command (init, install, enable, …)
  lib/                   core logic (store, config, frontmatter, npx, …)
test/
  lib/                   unit tests for src/lib
  cli/                   end-to-end tests that spawn the real CLI
  helpers.mjs            mkHome / run / mkSource / skillMd fixtures
scripts/
  e2e.mjs                opt-in test that does a REAL npx fetch (network)
examples/
  hello-world/SKILL.md   minimal example skill / template
```

### How a command works

Each command is a thin function in `src/commands/<name>.js` that reads args, calls
into `src/lib/*`, and prints. To add a command:

1. Create `src/commands/<name>.js` exporting `cmd<Name>(args)`.
2. Register it in the `switch` in [`src/cli.js`](./src/cli.js) (add aliases too).
3. Add tests in `test/cli/<name>.test.mjs` using the helpers (`mkHome`, `run`).
4. Add a row to the commands table in [`README.md`](./README.md).

The shared helpers in [`test/helpers.mjs`](./test/helpers.mjs) make CLI tests a
one-liner: `run(home, ['list'])` returns `{ out, err, code }`.

## Testing

- `npm test` — the default suite. **Must stay network-free** (no real npm/npx).
  Install/update tests use the `SKILL_CLI_FETCH_FIXTURE` test seam (a local fixture
  tree) instead of spawning `npx`.
- `npm run test:e2e` — opt-in, runs a **real** `npx skills add` fetch. Run it
  manually before a release to catch regressions in the real fetch path.

Guidelines:

- Every new code path gets a test. Aim for the smallest assertion that proves the
  behavior.
- Error paths and edge cases count — exit codes are part of the contract
  (`skill update` exits non-zero on failure so `update && deploy` is safe).
- Use `node:test` + `node:assert/strict` (built-in, zero new deps).

## Code style

- **ESM** (`"type": "module"`). No transpiler, no bundler.
- Keep dependencies minimal — two runtime deps (`picocolors`, `yaml`) by design.
  Don't add a dependency without justification.
- Comments should explain *why*, especially around security guards (`SAFE_NAME`,
  the Windows `cmd.exe` spawn) and non-obvious fixes (search for the `S1`/`B1`…
  markers in the code).
- Match the existing style: 2-space indent, single quotes, no semicolons.

## Pull request checklist

Before opening a PR:

- [ ] `npm test` passes locally.
- [ ] Tests added for new behavior / bug fixes.
- [ ] No new runtime dependency without a good reason.
- [ ] [README](./README.md) / [CHANGELOG](./CHANGELOG.md) updated if user-facing.
- [ ] No secrets, tokens, or personal paths committed.

Then open your PR against `main` and fill in the template. A maintainer will review
as soon as possible.

## Commit messages

Use a short, imperative summary (`fix: …`, `feat: …`, `docs: …`, `test: …`,
`refactor: …`). Reference the issue number if applicable (`Fixes #12`).

## Releasing

Maintainers follow [Keep a Changelog](https://keepachangelog.com/) and semver:

1. Update `CHANGELOG.md` and `package.json` version.
2. `npm run test:e2e` (real fetch path).
3. `npm test`, then tag and publish.

## Questions?

Open a [discussion or issue](https://github.com/victortomaili/skill-cli/issues) —
happy to help.
