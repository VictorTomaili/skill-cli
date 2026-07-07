import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSkillMd, normalizeTrigger, getTriggers } from '../../src/lib/frontmatter.js'

// ── parseSkillMd ────────────────────────────────────────────────────────────
test('normal frontmatter parses', () => {
  const { data, body } = parseSkillMd('---\nname: x\nversion: 1.0.0\n---\n# Body\n')
  assert.equal(data.name, 'x')
  assert.equal(data.version, '1.0.0')
  assert.match(body, /# Body/)
})
test('no frontmatter → whole content as body, empty data', () => {
  const { data, body } = parseSkillMd('# Just markdown\nno frontmatter')
  assert.deepEqual(data, {})
  assert.match(body, /Just markdown/)
})
test('BOM prefix is stripped (Windows regression)', () => {
  const { data } = parseSkillMd('\uFEFF---\nname: bom\ntriggers: [t]\n---\nbody')
  assert.equal(data.name, 'bom')
  assert.deepEqual(getTriggers(data), ['t'])
})
test('CRLF line endings parse', () => {
  const { data, body } = parseSkillMd('---\r\nname: x\r\n---\r\n# Body\r\n')
  assert.equal(data.name, 'x')
  assert.match(body, /# Body/)
})
test('malformed YAML frontmatter → empty data, no throw', () => {
  const { data } = parseSkillMd('---\nname: [unclosed\n---\nbody')
  assert.deepEqual(data, {})
})
test('empty content → empty data + empty body', () => {
  const { data, body } = parseSkillMd('')
  assert.deepEqual(data, {})
  assert.equal(body, '')
})
test('frontmatter only, no body', () => {
  const { data } = parseSkillMd('---\nname: x\n---\n')
  assert.equal(data.name, 'x')
})
test('body preserves markdown after frontmatter', () => {
  const { body } = parseSkillMd('---\nname: x\n---\n## H2\n\ntext\n')
  assert.match(body, /## H2/)
  assert.match(body, /text/)
})

// ── getTriggers ─────────────────────────────────────────────────────────────
test('array form, normalized', () => {
  assert.deepEqual(getTriggers({ triggers: ['a', 'B', '/C'] }), ['a', 'b', 'c'])
})
test('comma-string form, normalized', () => {
  assert.deepEqual(getTriggers({ triggers: 'research, deep, /code' }), ['research', 'deep', 'code'])
})
test('single string', () => {
  assert.deepEqual(getTriggers({ triggers: 'solo' }), ['solo'])
})
test('missing → empty', () => {
  assert.deepEqual(getTriggers({}), [])
})
test('filters falsy entries', () => {
  assert.deepEqual(getTriggers({ triggers: ['a', '', '   '] }), ['a'])
})

// ── normalizeTrigger ────────────────────────────────────────────────────────
test('strips leading slashes + lowercases + trims', () => {
  assert.equal(normalizeTrigger('/Research'), 'research')
  assert.equal(normalizeTrigger('//X'), 'x')
  assert.equal(normalizeTrigger('  MixedCase '), 'mixedcase')
})
test('empty input → empty', () => {
  assert.equal(normalizeTrigger(''), '')
})

