// install tests — use the SKILL_CLI_FETCH_FIXTURE seam (no real npx / network).
// Exercises the full install logic: name resolution, cpSync, .source recording,
// reinstall detection, multi-skill, and the empty-source error path.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mkHome, run, mkSource, strip } from '../helpers.mjs'

// install from a local fixture dir (mirrors npx output) — source arg is ignored
// by the fake fetch, only the fixture matters.
function install(h, fixture, sourceArg = 'fake-source') {
  return run(h, ['install', sourceArg], { SKILL_CLI_FETCH_FIXTURE: fixture })
}

test('install: no-arg → usage error', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const r = run(h, ['install'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Usage: skill install/)
})

test('install: fixture → skill in store + .source recorded', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const fix = mkSource(h, 'fix', [{ name: 'alpha', description: 'd', triggers: ['x'] }])
  const r = install(h, fix)
  assert.equal(r.code, 0)
  assert.ok(fs.existsSync(path.join(h, '.skill-cli', 'store', 'alpha', 'SKILL.md')))
  assert.ok(fs.existsSync(path.join(h, '.skill-cli', 'store', 'alpha', '.source')))
})

test('install: uses SKILL.md name field (not dir name) as skill name', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  // dir 'foo-dir' but name field 'canonical-name'
  const root = path.join(h, 'fix')
  fs.mkdirSync(path.join(root, 'foo-dir'), { recursive: true })
  fs.writeFileSync(path.join(root, 'foo-dir', 'SKILL.md'),
    '---\nname: canonical-name\nversion: 1.0.0\n---\nbody\n')
  install(h, root)
  assert.ok(fs.existsSync(path.join(h, '.skill-cli', 'store', 'canonical-name', 'SKILL.md')))
})

test('install: reinstall shows ↻ and "reinstalled" (M5)', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const fix = mkSource(h, 'fix', [{ name: 'alpha' }])
  install(h, fix)
  const out = strip(install(h, fix).out)
  assert.match(out, /reinstalled/)
})

test('install: multi-skill fixture installs all skills', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const fix = mkSource(h, 'fix', [{ name: 'aaa' }, { name: 'bbb' }])
  const r = install(h, fix)
  assert.equal(r.code, 0)
  assert.ok(fs.existsSync(path.join(h, '.skill-cli', 'store', 'aaa', 'SKILL.md')))
  assert.ok(fs.existsSync(path.join(h, '.skill-cli', 'store', 'bbb', 'SKILL.md')))
})

test('install: empty fixture → "No skills moved" error', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const empty = path.join(h, 'emptyfix')
  fs.mkdirSync(empty, { recursive: true })
  const r = install(h, empty)
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /No skills moved/i)
})

test('install: nonexistent fixture → error (no skills found)', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const r = install(h, path.join(h, 'does-not-exist'))
  assert.notEqual(r.code, 0)
})
