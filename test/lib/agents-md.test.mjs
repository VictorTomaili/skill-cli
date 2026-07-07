// Unit tests for agents-md.js injectBlock — the pure block-injection logic
// (append / replace / idempotent), independent of the filesystem.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { injectBlock } from '../../src/lib/agents-md.js'

const BEGIN = '<!-- BEGIN skill-cli -->'
const count = (s) => (s.match(/BEGIN skill-cli/g) || []).length

test('injectBlock: empty content → exactly one block', () => {
  assert.equal(count(injectBlock('')), 1)
})

test('injectBlock: appends block after existing content', () => {
  const out = injectBlock('# My notes\n')
  assert.match(out, /# My notes/)
  assert.equal(count(out), 1)
  assert.ok(out.indexOf('# My notes') < out.indexOf(BEGIN))
})

test('injectBlock: replaces existing block (idempotent, no duplicate)', () => {
  const once = injectBlock('hello')
  const twice = injectBlock(once)
  assert.equal(count(twice), 1)
  assert.match(twice, /hello/)
})

test('injectBlock: re-inject after external edits keeps a single fresh block', () => {
  const stale = injectBlock('hello') + '\n## extra\n'
  const fresh = injectBlock(stale)
  assert.equal(count(fresh), 1)
  assert.match(fresh, /hello/)
  assert.match(fresh, /## extra/)
})

test('injectBlock: handles content that already contains the markers literally', () => {
  // a pre-existing manual block is replaced, not duplicated
  const manual = 'intro\n\n<!-- BEGIN skill-cli -->\nOLD\n<!-- END skill-cli -->\n\ntail'
  const out = injectBlock(manual)
  assert.equal(count(out), 1)
  assert.match(out, /intro/)
  assert.match(out, /tail/)
  assert.doesNotMatch(out, /\bOLD\b/)
})
