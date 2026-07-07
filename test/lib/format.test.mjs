import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trunc, pad } from '../../src/lib/format.js'

// ── trunc ───────────────────────────────────────────────────────────────────
test('short string unchanged', () => {
  assert.equal(trunc('hello', 10), 'hello')
})
test('exact length unchanged', () => {
  assert.equal(trunc('hello', 5), 'hello')
})
test('long string → ellipsis (n-1 chars + …)', () => {
  assert.equal(trunc('hello world', 8), 'hello w…')
})
test('newlines collapsed to single spaces', () => {
  assert.equal(trunc('a\nb\nc', 20), 'a b c')
})
test('CRLF collapsed too', () => {
  assert.equal(trunc('a\r\nb', 20), 'a b')
})
test('null/undefined → empty string', () => {
  assert.equal(trunc(null, 5), '')
  assert.equal(trunc(undefined, 5), '')
})
test('trims surrounding whitespace', () => {
  assert.equal(trunc('  hi  ', 10), 'hi')
})

// ── pad ─────────────────────────────────────────────────────────────────────
test('pads short string to width', () => {
  assert.equal(pad('hi', 5), 'hi   ')
})
test('exact length unchanged', () => {
  assert.equal(pad('hello', 5), 'hello')
})
test('longer than width → sliced to width', () => {
  assert.equal(pad('hello world', 5), 'hello')
})
test('default width is 22', () => {
  assert.equal(pad('x').length, 22)
})
test('number input coerced to string', () => {
  assert.equal(pad(123, 6), '123   ')
})
