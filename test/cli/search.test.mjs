import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkHome, run, strip } from '../helpers.mjs'

// The search TUI is interactive (inquirer needs a TTY). These tests lock the
// GATING: on a non-TTY (agents/CI — which is what run() spawns) the command must
// refuse and exit non-zero, never attempting to open a prompt (which would hang).

test('search: non-TTY (agent) → refuses, exit non-zero', () => {
  const r = run(mkHome(), ['search'])   // run() spawns a non-TTY stdin
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /interactive|terminal/i)
})

test('search: browse alias is gated too (non-TTY → error)', () => {
  const r = run(mkHome(), ['browse'])
  assert.notEqual(r.code, 0)
})

test('install: no source + non-TTY → usage error (does NOT open the TUI)', () => {
  const r = run(mkHome(), ['install'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Usage: skill install/)
})
