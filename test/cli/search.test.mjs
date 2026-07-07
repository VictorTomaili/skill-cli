import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkHome, run, strip } from '../helpers.mjs'
import { withEscExit } from '../../src/commands/search.js'

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

// withEscExit: the ESC→abort wrapper. Its error classification is unit-testable
// without a TTY (the live keypress path needs a real terminal).
test('withEscExit: AbortPromptError → aborted:true (ESC path)', async () => {
  const e = new Error('aborted'); e.name = 'AbortPromptError'
  const r = await withEscExit(async () => { throw e })
  assert.equal(r.aborted, true)
})

test('withEscExit: ExitPromptError (Ctrl-C) → aborted:true', async () => {
  const e = new Error('sigint'); e.name = 'ExitPromptError'
  const r = await withEscExit(async () => { throw e })
  assert.equal(r.aborted, true)
})

test('withEscExit: normal return → aborted:false, value preserved', async () => {
  const r = await withEscExit(async () => 'result')
  assert.equal(r.aborted, false)
  assert.equal(r.value, 'result')
})

test('withEscExit: unrelated error rethrows (not swallowed as abort)', async () => {
  await assert.rejects(withEscExit(async () => { throw new Error('boom') }), /boom/)
})
