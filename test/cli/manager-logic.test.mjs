import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeToggle } from '../../src/commands/manager.js'

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
