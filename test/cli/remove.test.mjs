import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mkHome, run, putStoreSkill, strip } from '../helpers.mjs'

const storeDir = (h, n) => path.join(h, '.skill-cli', 'store', n)

test('remove: no-arg → usage error', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'foo', {}, '# Foo')
  const r = run(h, ['remove'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Usage: skill remove/)
})

test('remove: non-TTY (agent) → removes without prompting', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'foo', {}, '# Foo')
  // run() spawns a non-TTY stdin → the agent path: no prompt, removes directly
  const r = run(h, ['remove', 'foo'])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /removed/)
  assert.doesNotMatch(strip(r.out), /About to remove/)   // no prompt shown
  assert.equal(fs.existsSync(storeDir(h, 'foo')), false)
})

test('remove: -y skips the prompt even on a TTY', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'foo', {}, '# Foo')
  const r = run(h, ['remove', 'foo', '-y'], { SKILL_CLI_FORCE_TTY: '1' })
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /removed/)
  assert.doesNotMatch(strip(r.out), /Remove\?/)
  assert.equal(fs.existsSync(storeDir(h, 'foo')), false)
})

test('remove: interactive TTY + "y" → removes', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'foo', {}, '# Foo')
  const r = run(h, ['remove', 'foo'], { SKILL_CLI_FORCE_TTY: '1' }, 'y\n')
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /About to remove/)
  assert.match(strip(r.out), /Remove\?/)
  assert.match(strip(r.out), /removed/)
  assert.equal(fs.existsSync(storeDir(h, 'foo')), false)
})

test('remove: interactive TTY + "n" → aborts, keeps skill', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'foo', {}, '# Foo')
  const r = run(h, ['remove', 'foo'], { SKILL_CLI_FORCE_TTY: '1' }, 'n\n')
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /Aborted/)
  assert.equal(fs.existsSync(storeDir(h, 'foo')), true)   // kept
})

test('remove: interactive TTY + empty Enter → aborts (default N)', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'foo', {}, '# Foo')
  const r = run(h, ['remove', 'foo'], { SKILL_CLI_FORCE_TTY: '1' }, '\n')
  assert.match(strip(r.out), /Aborted/)
  assert.equal(fs.existsSync(storeDir(h, 'foo')), true)
})

test('remove: unknown skill → "not installed", exit 0', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  const r = run(h, ['remove', 'nope'])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /not installed/i)
  assert.match(strip(r.out), /Nothing to remove/)
})

test('remove: case-insensitive name (canonical shown)', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'Foo-Bar', {}, '# FooBar')
  const r = run(h, ['remove', 'FOO-BAR'])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /Foo-Bar/)
  assert.match(strip(r.out), /removed/)
  assert.equal(fs.existsSync(storeDir(h, 'Foo-Bar')), false)
})

test('remove: cleans global enabled_global', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'foo', {}, '# Foo')
  run(h, ['enable', 'foo', '-g'])
  const cfgBefore = fs.readFileSync(path.join(h, '.skill-cli', 'config.yaml'), 'utf8')
  assert.match(cfgBefore, /- foo/)
  run(h, ['remove', 'foo'])
  const cfgAfter = fs.readFileSync(path.join(h, '.skill-cli', 'config.yaml'), 'utf8')
  assert.doesNotMatch(cfgAfter, /foo/)
  assert.equal(fs.existsSync(storeDir(h, 'foo')), false)
})

test('remove: multiple skills at once (unknown ones skipped)', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'a', {}, '# A')
  putStoreSkill(h, 'b', {}, '# B')
  putStoreSkill(h, 'c', {}, '# C')
  const r = run(h, ['remove', 'a', 'b', 'zzz'])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /2 skill\(s\) removed/)
  assert.match(strip(r.out), /zzz.*not installed/s)
  assert.equal(fs.existsSync(storeDir(h, 'a')), false)
  assert.equal(fs.existsSync(storeDir(h, 'b')), false)
  assert.equal(fs.existsSync(storeDir(h, 'c')), true)    // untouched
})

test('remove: after remove, list no longer shows it', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'foo', {}, '# Foo')
  run(h, ['remove', 'foo'])
  assert.doesNotMatch(strip(run(h, ['list']).out), /foo/)
})

test('remove: aliases rm and uninstall dispatch correctly', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'foo', {}, '# Foo')
  run(h, ['rm', 'foo'])
  assert.equal(fs.existsSync(storeDir(h, 'foo')), false)
  putStoreSkill(h, 'bar', {}, '# Bar')
  run(h, ['uninstall', 'bar'])
  assert.equal(fs.existsSync(storeDir(h, 'bar')), false)
})
