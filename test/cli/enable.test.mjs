import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkHome, run, putStoreSkill, strip } from '../helpers.mjs'

// store must be initialized before enable reads/writes config
function setup() {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha', { triggers: ['x'] })
  putStoreSkill(h, 'beta', { triggers: ['y'] })
  return h
}

test('enable: no-arg → usage error', () => {
  const r = run(setup(), ['enable'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Usage: skill enable/)
})

test('enable nonexistent → error + install hint (N4)', () => {
  const r = run(setup(), ['enable', 'typo', '-g'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Not installed/)
  assert.match(strip(r.err + r.out), /install/i)
})

test('enable -g: marks active globally', () => {
  const h = setup()
  const r = run(h, ['enable', 'alpha', '-g'])
  assert.equal(r.code, 0)
  const list = strip(run(h, ['list']).out)
  assert.match(list, /●.*alpha/)
})

test('enable (project): marks active in project only', () => {
  const h = setup()
  run(h, ['enable', 'alpha'])
  const list = strip(run(h, ['list']).out)
  assert.match(list, /●.*alpha/)
  assert.match(list, /project/)   // scope label shows "project"
})

test('enable case-insensitive: "Alpha" matches installed "alpha"', () => {
  const h = setup()
  const r = run(h, ['enable', 'Alpha', '-g'])
  assert.equal(r.code, 0)
})

test('enable -g twice → no duplicate in config', () => {
  const h = setup()
  run(h, ['enable', 'alpha', '-g'])
  run(h, ['enable', 'alpha', '-g'])
  const cfg = require_fs(h)  // see below
  const hits = (cfg.match(/alpha/gi) || [])
  assert.equal(hits.length, 1)
})

test('enable stores name LOWERCASE (canonical mapping in computeEffective)', () => {
  const h = setup()
  run(h, ['enable', 'Alpha', '-g'])
  const cfg = require_fs(h)
  assert.match(cfg, /- alpha/)
  assert.doesNotMatch(cfg, /Alpha/)
})

// tiny helper to read the global config file as text
import fs from 'node:fs'
import path from 'node:path'
function require_fs(h) {
  return fs.readFileSync(path.join(h, '.skill-cli', 'config.yaml'), 'utf8')
}
