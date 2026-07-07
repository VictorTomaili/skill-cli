// update tests — use the SKILL_CLI_FETCH_FIXTURE seam. install records .source,
// then update re-fetches the SAME fixture; mutating the fixture between calls
// simulates a remote change, exercising hash-diff + version-compare paths.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mkHome, run, mkSource, putStoreSkill, strip } from '../helpers.mjs'

function upd(h, args, fixture) {
  return run(h, ['update', ...args], fixture ? { SKILL_CLI_FETCH_FIXTURE: fixture } : {})
}
function installFrom(h, fixture) {
  return run(h, ['install', 'fake'], { SKILL_CLI_FETCH_FIXTURE: fixture })
}

test('update: empty store → "Nothing to update"', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  assert.match(strip(run(h, ['update']).out), /Nothing to update/)
})

test('update: skill without .source → "source unknown"', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'manual', {})
  assert.match(strip(run(h, ['update']).out), /source unknown/)
})

test('update: detects changed source (version bump shown)', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const fix = mkSource(h, 'fix', [{ name: 'alpha', version: '1.0.0' }])
  installFrom(h, fix)
  fs.writeFileSync(path.join(fix, 'alpha', 'SKILL.md'),
    '---\nname: alpha\nversion: 2.0.0\n---\n# v2\n')
  assert.match(strip(upd(h, [], fix).out), /1\.0\.0 → 2\.0\.0/)
})

test('update: unchanged source → "up to date"', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const fix = mkSource(h, 'fix', [{ name: 'alpha', version: '1.0.0' }])
  installFrom(h, fix)
  assert.match(strip(upd(h, [], fix).out), /up to date/)
})

test('update: content change without version → "content changed"', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const fix = mkSource(h, 'fix', [{ name: 'alpha', version: '1.0.0' }])
  installFrom(h, fix)
  fs.writeFileSync(path.join(fix, 'alpha', 'SKILL.md'),
    '---\nname: alpha\nversion: 1.0.0\n---\n# different body\n')
  assert.match(strip(upd(h, [], fix).out), /content changed/)
})

test('update: specific name processes only that skill', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const fix = mkSource(h, 'fix', [{ name: 'alpha', version: '1.0.0' }, { name: 'beta', version: '1.0.0' }])
  installFrom(h, fix)
  fs.writeFileSync(path.join(fix, 'alpha', 'SKILL.md'),
    '---\nname: alpha\nversion: 9.9.9\n---\n# x\n')
  const out = strip(upd(h, ['alpha'], fix).out)
  assert.match(out, /1\.0\.0 → 9\.9\.9/)
  assert.doesNotMatch(out, /beta/)
})

test('update: nonexistent name → "not installed"', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha', {})
  assert.match(strip(run(h, ['update', 'ghost']).out), /not installed/)
})

test('update: preserves .source after replacing content', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const fix = mkSource(h, 'fix', [{ name: 'alpha', version: '1.0.0' }])
  installFrom(h, fix)
  fs.writeFileSync(path.join(fix, 'alpha', 'SKILL.md'),
    '---\nname: alpha\nversion: 2.0.0\n---\n# v2\n')
  upd(h, [], fix)
  // .source must still exist (update re-writes it)
  assert.ok(fs.existsSync(path.join(h, '.skill-cli', 'store', 'alpha', '.source')))
})
