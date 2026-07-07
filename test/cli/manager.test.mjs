import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkHome, run, strip } from '../helpers.mjs'

// The manager is an interactive keyboard loop (needs a TTY). These lock the
// GATING so agents/CI never hit it (they'd hang), plus the safe empty-store path.

test('manager: no-args non-TTY → prints HELP (no TUI opened)', () => {
  const r = run(mkHome(), [])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /cross-agent skill manager/i)
})

test('manager: explicit "manager" non-TTY → refuses, exit non-zero', () => {
  const r = run(mkHome(), ['manager'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /interactive|terminal/i)
})

test('manager: explicit "ui" alias non-TTY → refuses too', () => {
  const r = run(mkHome(), ['ui'])
  assert.notEqual(r.code, 0)
})

test('manager: FORCE_TTY + empty store → "Store empty", returns without opening a prompt (no hang)', () => {
  const r = run(mkHome(), ['manager'], { SKILL_CLI_FORCE_TTY: '1' })
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /Store empty/)
})
