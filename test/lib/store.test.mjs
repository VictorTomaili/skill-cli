// sanitizeSkillName unit tests — the S1 (path-traversal) guard shared by install
// and readSkill. A malicious frontmatter `name: ../x` must never reach a path.join
// onto STORE_DIR (it could rmSync/cpSync outside the store).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeSkillName } from '../../src/lib/store.js'

test('sanitizeSkillName: accepts a plain identifier', () => {
  assert.equal(sanitizeSkillName('commit-helper'), 'commit-helper')
  assert.equal(sanitizeSkillName('a.b_c-1'), 'a.b_c-1')
  assert.equal(sanitizeSkillName('ABC'), 'ABC')
})

test('sanitizeSkillName: rejects path traversal (S1)', () => {
  assert.equal(sanitizeSkillName('..'), null)
  assert.equal(sanitizeSkillName('../x'), null)
  assert.equal(sanitizeSkillName('../../etc'), null)
  assert.equal(sanitizeSkillName('foo/../bar'), null)
})

test('sanitizeSkillName: rejects separators / leading dot / empty / non-string', () => {
  assert.equal(sanitizeSkillName('/etc'), null)
  assert.equal(sanitizeSkillName('\\windows'), null)
  assert.equal(sanitizeSkillName('.hidden'), null)
  assert.equal(sanitizeSkillName(''), null)
  assert.equal(sanitizeSkillName(null), null)
  assert.equal(sanitizeSkillName(undefined), null)
})

test('sanitizeSkillName: rejects a name with a colon (no drive/absolute tricks)', () => {
  assert.equal(sanitizeSkillName('C:x'), null)
})
