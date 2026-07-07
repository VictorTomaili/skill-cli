import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeEffective, computeDefaults } from '../../src/lib/config.js'

// build an installed-store entry the way listStore() does
const sk = (name) => ({ name, dir: name, description: '', version: '1', triggers: [], path: '' })
const G = (enabled_global) => ({ enabled_global })
const P = (projCfg) => ({ inherit: true, deny: [], allow: [], ...projCfg })

// ── no project config: pure global ──────────────────────────────────────────
test('no project config → all globally-enabled skills', () => {
  assert.deepEqual(computeEffective([sk('a'), sk('b'), sk('c')], G(['a', 'c']), null), ['a', 'c'])
})
test('empty global → empty', () => {
  assert.deepEqual(computeEffective([sk('a')], G([]), null), [])
})
test('global name not installed → dropped', () => {
  assert.deepEqual(computeEffective([sk('a')], G(['a', 'ghost']), null), ['a'])
})

// ── project inherit (default true) ──────────────────────────────────────────
test('inherit=true → global + allow merged', () => {
  const inst = [sk('a'), sk('b'), sk('c'), sk('d')]
  assert.deepEqual(computeEffective(inst, G(['a']), P({ allow: ['c'] })), ['a', 'c'])
})
test('inherit=false → only allow (global ignored entirely)', () => {
  assert.deepEqual(computeEffective([sk('a'), sk('b')], G(['a']), P({ inherit: false, allow: ['b'] })), ['b'])
})
test('inherit=false with no allow → empty', () => {
  assert.deepEqual(computeEffective([sk('a')], G(['a']), P({ inherit: false })), [])
})

// ── deny rules ──────────────────────────────────────────────────────────────
test('deny ["*"] blocks everything inherited', () => {
  assert.deepEqual(computeEffective([sk('a'), sk('b')], G(['a', 'b']), P({ deny: ['*'] })), [])
})
test('exact deny (no glob) removes only that name', () => {
  assert.deepEqual(computeEffective([sk('a'), sk('b'), sk('c')], G(['a', 'b', 'c']), P({ deny: ['b'] })), ['a', 'c'])
})
test('deny non-installed name → no-op', () => {
  assert.deepEqual(computeEffective([sk('a')], G(['a']), P({ deny: ['zzz'] })), ['a'])
})
test('deny WITHOUT "*" is literal/exact (no wildcard expansion)', () => {
  // 'react-?' has no '*', so it's treated as an exact name — matches nothing here
  const inst = [sk('react-bp'), sk('react-forms')]
  assert.deepEqual(computeEffective(inst, G(['react-bp', 'react-forms']), P({ deny: ['react-?'] })), ['react-bp', 'react-forms'])
})

// ── glob deny patterns (only when pattern contains "*") ────────────────────
test('deny glob "react-*" matches react-bp + react-forms, spares vue', () => {
  const inst = [sk('react-bp'), sk('react-forms'), sk('vue-bp')]
  assert.deepEqual(computeEffective(inst, G(['react-bp', 'react-forms', 'vue-bp']), P({ deny: ['react-*'] })), ['vue-bp'])
})
test('deny glob suffix "*-bp"', () => {
  const inst = [sk('react-bp'), sk('vue-bp'), sk('core')]
  assert.deepEqual(computeEffective(inst, G(['react-bp', 'vue-bp', 'core']), P({ deny: ['*-bp'] })), ['core'])
})
test('deny glob prefix "re*"', () => {
  const inst = [sk('react'), sk('redux'), sk('vue')]
  assert.deepEqual(computeEffective(inst, G(['react', 'redux', 'vue']), P({ deny: ['re*'] })), ['vue'])
})
test('multiple deny patterns compose', () => {
  const inst = [sk('a'), sk('b'), sk('c'), sk('test-x')]
  assert.deepEqual(computeEffective(inst, G(['a', 'b', 'c', 'test-x']), P({ deny: ['b', 'test-*'] })), ['a', 'c'])
})
test('deny pattern >200 chars ignored (ReDoS guard)', () => {
  const inst = [sk('a')]
  const long = 'a*' + 'b'.repeat(201)   // contains '*', length > 200
  assert.deepEqual(computeEffective(inst, G(['a']), P({ deny: [long] })), ['a'])
})

// ── allow always wins ───────────────────────────────────────────────────────
test('deny ["*"] + allow [X] = pure allowlist (only X)', () => {
  const inst = [sk('a'), sk('b'), sk('c')]
  assert.deepEqual(computeEffective(inst, G(['a', 'b', 'c']), P({ deny: ['*'], allow: ['b'] })), ['b'])
})
test('allow X with deny X → X stays (allow wins)', () => {
  assert.deepEqual(computeEffective([sk('a')], G(['a']), P({ deny: ['a'], allow: ['a'] })), ['a'])
})
test('deny glob "react-*" + allow [react-forms] keeps it', () => {
  const inst = [sk('react-bp'), sk('react-forms')]
  assert.deepEqual(computeEffective(inst, G(['react-bp', 'react-forms']), P({ deny: ['react-*'], allow: ['react-forms'] })), ['react-forms'])
})
test('allow non-installed name → dropped', () => {
  assert.deepEqual(computeEffective([sk('a')], G([]), P({ allow: ['ghost'] })), [])
})

// ── case-insensitivity + canonical output ───────────────────────────────────
test('case-insensitive: global "React-BP" matches installed "react-bp"', () => {
  assert.deepEqual(computeEffective([sk('react-bp')], G(['React-BP']), null), ['react-bp'])
})
test('returns CANONICAL names (preserves installed casing)', () => {
  assert.deepEqual(computeEffective([sk('React-BP')], G(['react-bp']), null), ['React-BP'])
})
test('deny case-insensitive: deny "REACT-*" blocks "react-bp"', () => {
  assert.deepEqual(computeEffective([sk('react-bp')], G(['react-bp']), P({ deny: ['REACT-*'] })), [])
})

// ── ordering ────────────────────────────────────────────────────────────────
test('output is sorted', () => {
  const inst = [sk('c'), sk('a'), sk('b')]
  assert.deepEqual(computeEffective(inst, G(['c', 'a', 'b']), null), ['a', 'b', 'c'])
})

// ── computeDefaults (auto-load flag; an axis INDEPENDENT of enable/deny) ──────
const GD = (defaults_global) => ({ defaults_global })

test('computeDefaults: no project → global defaults', () => {
  assert.deepEqual(computeDefaults([sk('a'), sk('b')], GD(['a']), null), ['a'])
})
test('computeDefaults: empty global + no project → []', () => {
  assert.deepEqual(computeDefaults([sk('a')], GD([]), null), [])
})
test('computeDefaults: project defaults merge with inherited global', () => {
  assert.deepEqual(computeDefaults([sk('a'), sk('b'), sk('c')], GD(['a']), P({ defaults: ['c'] })), ['a', 'c'])
})
test('computeDefaults: inherit=false → global defaults ignored', () => {
  assert.deepEqual(computeDefaults([sk('a'), sk('b')], GD(['a']), P({ inherit: false, defaults: ['b'] })), ['b'])
})
test('computeDefaults: only installed skills resolve (ghost dropped)', () => {
  assert.deepEqual(computeDefaults([sk('a')], GD(['a', 'ghost']), null), ['a'])
})
test('computeDefaults: case-insensitive, canonical, sorted', () => {
  assert.deepEqual(computeDefaults([sk('React-BP'), sk('vue')], GD(['react-bp']), P({ defaults: ['VUE'] })), ['React-BP', 'vue'])
})
test('computeDefaults: independent of deny (a denied skill can still default)', () => {
  // deny governs active state; the default flag is a separate axis
  assert.deepEqual(computeDefaults([sk('a')], GD(['a']), P({ deny: ['*'] })), ['a'])
})
