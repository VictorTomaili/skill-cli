import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkHome, run, putStoreSkill, strip } from '../helpers.mjs'

function setup() {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha', {}, '# Alpha\nLine two.')
  return h
}

test('cat: no-arg → usage error', () => {
  const r = run(setup(), ['cat'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Usage: skill cat/)
})

test('cat: exists → dumps body content', () => {
  const out = strip(run(setup(), ['cat', 'alpha']).out)
  assert.match(out, /# Alpha/)
  assert.match(out, /Line two\./)
})

test('cat: not-found → error', () => {
  const r = run(setup(), ['cat', 'nope'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /not found/i)
})

test('cat: case-insensitive name', () => {
  const r = run(setup(), ['cat', 'ALPHA'])
  assert.equal(r.code, 0)
})

test('cat ".." rejected — path traversal (N3)', () => {
  const r = run(setup(), ['cat', '..'])
  assert.notEqual(r.code, 0)
})

test('cat "../etc/passwd" rejected — path traversal (N3)', () => {
  const r = run(setup(), ['cat', '../etc/passwd'])
  assert.notEqual(r.code, 0)
})

test('cat with slashes rejected (N3)', () => {
  const r = run(setup(), ['cat', 'a/b'])
  assert.notEqual(r.code, 0)
})

test('cat: body is trimmed of leading/trailing whitespace', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'ws', {}, '\n\n# Body\n\n')
  const out = strip(run(h, ['cat', 'ws']).out)
  assert.match(out, /# Body/)
})
