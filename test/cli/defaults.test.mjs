import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mkHome, putStoreSkill, run, strip } from '../helpers.mjs'

// `skill defaults` / `default` / `undefault` — the auto-load flag. Driven via the
// CLI (the path agents use to mark defaults) against an isolated SKILL_CLI_HOME.

test('defaults: none yet → hint message', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const r = run(h, ['defaults'])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /No default skills/)
})

test('default <name>: not installed → error, exit non-zero', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const r = run(h, ['default', 'ghost'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Not installed/)
})

test('default <name> -g → appears in `skill defaults`', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha', { description: 'an alpha skill' })
  assert.equal(run(h, ['default', 'alpha', '-g']).code, 0)
  const d = run(h, ['defaults'])
  assert.match(strip(d.out), /alpha/)
  assert.match(strip(d.out), /an alpha skill/)
})

test('default <name> (project) → recorded in skill.config, listed in this cwd', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'beta')
  assert.equal(run(h, ['default', 'beta']).code, 0)
  assert.match(strip(run(h, ['defaults']).out), /beta/)
})

test('undefault <name> -g → removed from defaults', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha')
  run(h, ['default', 'alpha', '-g'])
  run(h, ['undefault', 'alpha', '-g'])
  assert.match(strip(run(h, ['defaults']).out), /No default skills/)
})

test('undefault when not a default → graceful no-op', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha')
  const r = run(h, ['undefault', 'alpha', '-g'])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /not a global default/)
})

test('list shows ★ for a default skill', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha')
  putStoreSkill(h, 'beta')
  run(h, ['default', 'alpha', '-g'])
  const out = strip(run(h, ['list']).out)
  assert.match(out, /alpha[\s\S]*★|★[\s\S]*alpha/)   // alpha is starred
  // beta must NOT be starred (only its own row, no ★ on it)
  const betaRow = out.split('\n').find(l => /beta/.test(l))
  assert.ok(betaRow)
  assert.doesNotMatch(betaRow, /★/)
})

test('AGENTS.md block mentions the defaults workflow', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const md = fs.readFileSync(path.join(h, '.claude', 'CLAUDE.md'), 'utf8')
  assert.match(md, /skill defaults/)
  assert.match(md, /skill default <name>/)
})
