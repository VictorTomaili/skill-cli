import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mkHome, putStoreSkill, run, strip } from '../helpers.mjs'

// `skill active` (aliases: `status`, legacy `defaults`) / `default` / `undefault`.
// Driven via the CLI against an isolated SKILL_CLI_HOME.

test('active: none yet → hint message', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const r = run(h, ['active'])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /No active skills/)
})

test('active: `status` and legacy `defaults` are aliases', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha', { description: 'alpha desc' })
  run(h, ['default', 'alpha', '-g'])
  assert.match(strip(run(h, ['status']).out), /alpha/)
  assert.match(strip(run(h, ['defaults']).out), /alpha/)   // legacy alias
})

test('default <name>: not installed → error, exit non-zero', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const r = run(h, ['default', 'ghost'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Not installed/)
})

test('default <name> -g → appears in `skill active`', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha', { description: 'an alpha skill' })
  assert.equal(run(h, ['default', 'alpha', '-g']).code, 0)
  const d = run(h, ['active'])
  assert.match(strip(d.out), /alpha/)
  assert.match(strip(d.out), /an alpha skill/)
})

test('default <name> (no -g) → global default (config.yaml, not skill.config)', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'beta')
  assert.equal(run(h, ['default', 'beta']).code, 0)
  assert.match(strip(run(h, ['active']).out), /beta/)
  // defaults are GLOBAL: no skill.config is created, the entry lives in config.yaml
  assert.ok(!fs.existsSync(path.join(h, 'skill.config')))
  assert.match(fs.readFileSync(path.join(h, '.skill-cli', 'config.yaml'), 'utf8'), /- beta/)
})

test('undefault <name> -g → removed from the active set', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha')
  run(h, ['default', 'alpha', '-g'])
  run(h, ['undefault', 'alpha', '-g'])
  // no default + no project allow → alpha is inactive → not listed
  assert.match(strip(run(h, ['active']).out), /No active skills/)
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

test('AGENTS.md block documents start gate + load/propose rule + discovery', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  const md = fs.readFileSync(path.join(h, '.claude', 'CLAUDE.md'), 'utf8')
  assert.match(md, /skill active/)
  assert.match(md, /skill default <name>/)
  assert.match(md, /START GATE/)
  assert.match(md, /BEFORE ANYTHING ELSE/)
  assert.match(md, /CATALOG/)
  assert.match(md, /LOADED/)
  assert.match(md, /PROPOSE/)
  assert.match(md, /easier or faster/)
  assert.match(md, /HIGHER QUALITY/)
  assert.match(md, /STYLE/)
  assert.match(md, /Discovery/)
})

test('skill active lists ONLY active skills with full descriptions', () => {
  const h = mkHome(); run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha', { description: 'A very long alpha description exceeding the sixty-six char truncation that must appear in FULL.' })
  putStoreSkill(h, 'beta', { description: 'beta desc' })
  run(h, ['default', 'alpha', '-g'])   // alpha active (default); beta inactive
  let out = strip(run(h, ['active']).out)
  assert.match(out, /alpha/)
  assert.match(out, /exceeding the sixty-six char truncation that must appear in FULL/)  // full desc
  assert.doesNotMatch(out, /beta/)     // inactive → not listed
  // a project allow makes beta active → now it is listed too
  fs.writeFileSync(path.join(h, 'skill.config'), 'allow:\n  - beta\n')
  out = strip(run(h, ['active']).out)
  assert.match(out, /alpha/)
  assert.match(out, /beta/)
  // no group-split headers — the agent decides, not the tool
  assert.doesNotMatch(out, /Auto-load/)
})
