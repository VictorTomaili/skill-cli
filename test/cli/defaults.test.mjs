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
  assert.match(strip(r.out), /No skills installed/)
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

test('default <name> (no -g) → global default (config.yaml, not skill.config)', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'beta')
  assert.equal(run(h, ['default', 'beta']).code, 0)
  assert.match(strip(run(h, ['defaults']).out), /beta/)
  // defaults are GLOBAL: no skill.config is created, the entry lives in config.yaml
  assert.ok(!fs.existsSync(path.join(h, 'skill.config')))
  assert.match(fs.readFileSync(path.join(h, '.skill-cli', 'config.yaml'), 'utf8'), /- beta/)
})

test('undefault <name> -g → removed from defaults', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha')
  run(h, ['default', 'alpha', '-g'])
  run(h, ['undefault', 'alpha', '-g'])
  const out = strip(run(h, ['defaults']).out)
  const alphaRow = out.split('\n').find(l => /alpha/.test(l))
  assert.ok(alphaRow)                       // catalog still lists the skill
  assert.doesNotMatch(alphaRow, /★/)       // but it's no longer a default
})

test('undefault when not a default → graceful no-op', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha')
  const r = run(h, ['undefault', 'alpha', '-g'])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /not a default/)
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

test('AGENTS.md block documents start gate + discovery + context-altering rules', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const md = fs.readFileSync(path.join(h, '.claude', 'CLAUDE.md'), 'utf8')
  assert.match(md, /skill defaults/)
  assert.match(md, /skill default <name>/)
  assert.match(md, /START GATE/)
  assert.match(md, /BEFORE ANYTHING ELSE/)
  assert.match(md, /CATALOG/)
  assert.match(md, /LOADED/)
  assert.match(md, /PROPOSE/)
  assert.match(md, /context-altering/i)
  assert.match(md, /Discovery/)
})

test('skill defaults lists ALL skills with full descriptions (catalog, no body)', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha', { description: 'A very long alpha description exceeding the sixty-six char truncation that must appear in FULL.' })
  putStoreSkill(h, 'beta', { description: 'beta desc' })
  run(h, ['default', 'alpha', '-g'])   // alpha is a default (★); beta is not
  const out = strip(run(h, ['defaults']).out)
  // BOTH skills appear (catalog = all), and the long description is NOT truncated
  assert.match(out, /alpha/)
  assert.match(out, /beta/)
  assert.match(out, /exceeding the sixty-six char truncation that must appear in FULL/)
  // alpha is starred (default), beta is not
  const alphaRow = out.split('\n').find(l => /alpha/.test(l))
  const betaRow = out.split('\n').find(l => /beta/.test(l))
  assert.match(alphaRow, /★/)
  assert.doesNotMatch(betaRow, /★/)
  // no group-split headers — the agent decides, not the tool
  assert.doesNotMatch(out, /Auto-load/)
  assert.doesNotMatch(out, /Context-altering/)
})
