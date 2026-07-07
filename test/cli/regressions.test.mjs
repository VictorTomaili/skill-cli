// CLI-level regression tests for issues found in manual testing.
//   S1  install path-traversal (frontmatter `name: ../x` must not escape store)
//   B1  update case-sensitivity (every other command folds case; update didn't)
//   B2  dead `default_agents` config field (present but never honored)
//   B3  version sentinel drift (list '-', show '?')
//   B4  idempotent init -g reported "updated" + rewrote files on every run
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mkHome, run, mkSource, strip } from '../helpers.mjs'

function installFrom(h, fixture) {
  return run(h, ['install', 'fake'], { SKILL_CLI_FETCH_FIXTURE: fixture })
}
function install(h, fixture, sourceArg = 'fake-source') {
  return run(h, ['install', sourceArg], { SKILL_CLI_FETCH_FIXTURE: fixture })
}

test('S1: frontmatter name "../EVIL" does NOT escape store (falls back to dir name)', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const root = path.join(h, 'fix')
  fs.mkdirSync(path.join(root, 'safe-dir'), { recursive: true })
  fs.writeFileSync(path.join(root, 'safe-dir', 'SKILL.md'),
    '---\nname: ../EVIL\ndescription: x\n---\nbody\n')
  const r = install(h, root)
  assert.equal(r.code, 0)
  // nothing outside store/
  assert.ok(!fs.existsSync(path.join(h, '.skill-cli', 'EVIL')))
  assert.ok(!fs.existsSync(path.join(h, 'EVIL')))
  // landed under the safe dir name inside the store, and store has ONLY that
  assert.ok(fs.existsSync(path.join(h, '.skill-cli', 'store', 'safe-dir', 'SKILL.md')))
  assert.deepEqual(fs.readdirSync(path.join(h, '.skill-cli', 'store')), ['safe-dir'])
})

test('S1: frontmatter name ".." is neutralized (falls back to dir name, no rmSync of CLI_ROOT)', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const root = path.join(h, 'fix')
  fs.mkdirSync(path.join(root, 'real-skill'), { recursive: true })
  fs.writeFileSync(path.join(root, 'real-skill', 'SKILL.md'),
    '---\nname: ..\ndescription: x\n---\nbody\n')
  const r = install(h, root)
  assert.equal(r.code, 0)
  // store + config still intact (the `name: ..` case would have rmSync'd CLI_ROOT)
  assert.ok(fs.existsSync(path.join(h, '.skill-cli', 'config.yaml')))
  assert.ok(fs.existsSync(path.join(h, '.skill-cli', 'store', 'real-skill', 'SKILL.md')))
})

test('B1: update folds case — `skill update ALPHA` updates alpha', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const fix = mkSource(h, 'fix', [{ name: 'alpha', version: '1.0.0' }])
  installFrom(h, fix)
  fs.writeFileSync(path.join(fix, 'alpha', 'SKILL.md'),
    '---\nname: alpha\nversion: 2.0.0\n---\n# v2\n')
  const r = run(h, ['update', 'ALPHA'], { SKILL_CLI_FETCH_FIXTURE: fix })
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /1\.0\.0 → 2\.0\.0/)
})

test('B2: config.yaml carries no dead default_agents field', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const cfg = fs.readFileSync(path.join(h, '.skill-cli', 'config.yaml'), 'utf8')
  assert.doesNotMatch(cfg, /default_agents/)
})

test('B2: stale default_agents + junk keys dropped on next write (normalize)', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  // seed an OLD-format config that still carries the dead key + random junk
  const cfgPath = path.join(h, '.skill-cli', 'config.yaml')
  fs.writeFileSync(cfgPath, [
    'version: 1',
    'store: ' + path.join(h, '.skill-cli', 'store'),
    'defaults: []',
    'default_agents:',
    '  - claude',
    '  - codex',
    'some_future_key: whatever',
  ].join('\n') + '\n')
  // init -g always calls writeGlobalConfig (read-merge then normalize-write),
  // so it must drop the stale keys even from a pre-existing old-format config.
  run(h, ['init', '-g'])
  const after = fs.readFileSync(cfgPath, 'utf8')
  assert.doesNotMatch(after, /default_agents/)
  assert.doesNotMatch(after, /some_future_key/)
  assert.match(after, /defaults:/)
})

test('B2b: legacy enabled_global + defaults_global migrate into defaults (union, backward-compat)', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  // seed an OLD-format config (pre-0.4.0) carrying BOTH legacy lists
  const cfgPath = path.join(h, '.skill-cli', 'config.yaml')
  fs.writeFileSync(cfgPath, [
    'version: 1',
    'store: ' + path.join(h, '.skill-cli', 'store'),
    'enabled_global:',
    '  - commit-helper',
    '  - shared',
    'defaults_global:',
    '  - shared',
    '  - research',
  ].join('\n') + '\n')
  // a re-init normalizes on write: the UNION of both legacy lists → defaults (deduped)
  run(h, ['init', '-g'])
  const after = fs.readFileSync(cfgPath, 'utf8')
  assert.match(after, /defaults:/)                  // new key written
  assert.doesNotMatch(after, /enabled_global:/)     // legacy keys dropped on write
  assert.doesNotMatch(after, /defaults_global:/)
  assert.match(after, /commit-helper/)              // every value preserved
  assert.match(after, /research/)
  assert.equal((after.match(/\bshared\b/g) || []).length, 1)   // deduped (once)
})

test('B3: show uses "-" (not "?") for a missing version field', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const dir = path.join(h, '.skill-cli', 'store', 'nov')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: nov\ndescription: d\n---\nbody\n')
  const show = strip(run(h, ['show', 'nov']).out)
  assert.match(show, /v-/)
  assert.doesNotMatch(show, /v\?/)
})

test('B4: idempotent init -g → "already set up", file not rewritten', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const file = path.join(h, '.claude', 'CLAUDE.md')
  const mtime1 = fs.statSync(file).mtimeMs
  const out2 = strip(run(h, ['init', '-g']).out)
  const mtime2 = fs.statSync(file).mtimeMs
  assert.match(out2, /already set up/)
  assert.equal(mtime1, mtime2, 'CLAUDE.md was rewritten on an idempotent re-run')
})
