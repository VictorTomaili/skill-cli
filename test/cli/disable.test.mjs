import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkHome, run, putStoreSkill, strip } from '../helpers.mjs'

function setup() {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha', { triggers: ['x'] })
  putStoreSkill(h, 'beta', { triggers: ['y'] })
  return h
}

test('disable: no-arg → usage error', () => {
  const r = run(setup(), ['disable'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Usage: skill disable/)
})

test('disable -g: removes from active', () => {
  const h = setup()
  run(h, ['enable', 'alpha', '-g'])
  const r = run(h, ['disable', 'alpha', '-g'])
  assert.equal(r.code, 0)
  assert.match(strip(run(h, ['list']).out), /○.*alpha/)
})

test('disable -g: not enabled → "nothing to do"', () => {
  const h = setup()
  // alpha never enabled globally
  const r = run(h, ['disable', 'alpha', '-g'])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /nothing to do/)
})

test('disable (project): removes project allow', () => {
  const h = setup()
  run(h, ['enable', 'alpha'])         // project
  const r = run(h, ['disable', 'alpha'])
  assert.equal(r.code, 0)
  assert.match(strip(run(h, ['list']).out), /○.*alpha/)
})

test('disable case-insensitive', () => {
  const h = setup()
  run(h, ['enable', 'alpha', '-g'])
  const r = run(h, ['disable', 'ALPHA', '-g'])
  assert.equal(r.code, 0)
  assert.match(strip(run(h, ['list']).out), /○.*alpha/)
})

test('disable -g then re-enable works (round-trip)', () => {
  const h = setup()
  run(h, ['enable', 'alpha', '-g'])
  run(h, ['disable', 'alpha', '-g'])
  run(h, ['enable', 'alpha', '-g'])
  assert.match(strip(run(h, ['list']).out), /●.*alpha/)
})
