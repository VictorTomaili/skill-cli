import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeToggle, moveCursor, computeToggleDefault } from '../../src/commands/manager.js'

// computeToggle is a PURE decision (no I/O), so it's unit-testable in-process
// without SKILL_CLI_HOME or a store on disk — we pass fake configs directly.
// This locks the allow/deny dance the manager's `space` key performs.
const installed = [{ name: 'alpha' }]
const gEmpty = { enabled_global: [] }
const gGlobal = { enabled_global: ['alpha'] }
const pNone = null
const pAllow = { allow: ['alpha'], deny: [] }
const pDeny = { allow: [], deny: ['alpha'] }

test('computeToggle: passive → add to project allow (turn ON)', () => {
  const r = computeToggle(installed, gEmpty, pNone, 'alpha')
  assert.deepEqual(r.allow, ['alpha'])
  assert.deepEqual(r.deny, [])
})

test('computeToggle: project-allowed → remove from allow (turn OFF)', () => {
  const r = computeToggle(installed, gEmpty, pAllow, 'alpha')
  assert.deepEqual(r.allow, [])
  assert.deepEqual(r.deny, [])
})

test('computeToggle: globally-enabled (not project-allowed) → add project deny (OFF here)', () => {
  const r = computeToggle(installed, gGlobal, pNone, 'alpha')
  assert.deepEqual(r.deny, ['alpha'])   // local deny overrides the global enable
  assert.deepEqual(r.allow, [])
})

test('computeToggle: turning back ON clears the deny + adds allow (allow wins)', () => {
  const r = computeToggle(installed, gGlobal, pDeny, 'alpha')
  assert.deepEqual(r.allow, ['alpha'])
  assert.deepEqual(r.deny, [])
})

test('computeToggle: is case-insensitive', () => {
  // stored canonical 'alpha'; configs might hold 'Alpha'
  const r = computeToggle(installed, gGlobal, { allow: [], deny: ['Alpha'] }, 'alpha')
  assert.deepEqual(r.deny, [])           // recognized + cleared despite case diff
})

// moveCursor clamps the keyboard cursor — also guards the @inquirer/core pitfall
// that its useState setter takes a VALUE (we compute the next index, not a fn).
test('moveCursor: down advances, clamps at the last row', () => {
  assert.equal(moveCursor(0, 5, 1), 1)
  assert.equal(moveCursor(4, 5, 1), 4)   // index 4 is the last of 5
})

test('moveCursor: up retreats, clamps at 0', () => {
  assert.equal(moveCursor(3, 5, -1), 2)
  assert.equal(moveCursor(0, 5, -1), 0)
})

test('moveCursor: empty list → 0 (no crash)', () => {
  assert.equal(moveCursor(2, 0, 1), 0)
  assert.equal(moveCursor(0, 0, -1), 0)
})

test('moveCursor: clamps an out-of-range cursor (after a delete shrinks the list)', () => {
  assert.equal(moveCursor(7, 3, 0), 2)   // cursor was 7, list is now 3 → last index 2
})

// computeToggleDefault — the manager `a` key toggles the project default flag.
test('computeToggleDefault: off → on (adds, lowercased)', () => {
  assert.deepEqual(computeToggleDefault({ defaults: [] }, 'Alpha'), ['alpha'])
})
test('computeToggleDefault: on → off (removes, case-insensitive)', () => {
  assert.deepEqual(computeToggleDefault({ defaults: ['alpha'] }, 'ALPHA'), [])
})
test('computeToggleDefault: null projCfg → starts from empty', () => {
  assert.deepEqual(computeToggleDefault(null, 'x'), ['x'])
})
test('computeToggleDefault: leaves siblings untouched', () => {
  assert.deepEqual(computeToggleDefault({ defaults: ['a', 'b'] }, 'b'), ['a'])
})
