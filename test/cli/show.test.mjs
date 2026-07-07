import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkHome, run, putStoreSkill, strip } from '../helpers.mjs'

function setup() {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha', { description: 'Alpha skill', triggers: ['Research'], version: '2.1.0' })
  return h
}

test('show: no-arg → usage error', () => {
  const r = run(setup(), ['show'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Usage: skill show/)
})

test('show: exists → name, version, path, triggers', () => {
  const out = strip(run(setup(), ['show', 'alpha']).out)
  assert.match(out, /alpha/)
  assert.match(out, /2\.1\.0/)
  assert.match(out, /Alpha skill/)
  assert.match(out, /triggers/)
})

test('show: not-found → error', () => {
  const r = run(setup(), ['show', 'nope'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /not found/i)
})

test('show: triggers are normalized (M3) — "Research" shown as /research', () => {
  const out = strip(run(setup(), ['show', 'alpha']).out)
  assert.match(out, /\/research/)
  assert.doesNotMatch(out, /\/Research/)
})

test('show: case-insensitive name lookup', () => {
  const r = run(setup(), ['show', 'ALPHA'])
  assert.equal(r.code, 0)
})

test('show: skill without triggers shows "—"', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'plain', {})
  const out = strip(run(h, ['show', 'plain']).out)
  assert.match(out, /triggers:\s+—/)
})
