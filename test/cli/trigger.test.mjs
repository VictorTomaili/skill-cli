import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mkHome, run, putStoreSkill, strip } from '../helpers.mjs'

// two skills share the `research` trigger for multi-match tests
function setup() {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'deep-research', { description: 'Deep', triggers: ['research'] }, '# Deep Research')
  putStoreSkill(h, 'paper-search', { description: 'Papers', triggers: ['research'] }, '# Paper Search')
  return h
}

test('trigger: no-arg → usage error', () => {
  const r = run(setup(), ['trigger'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Usage: skill trigger/)
})

test('trigger: no active skill with that trigger → informational, exit 0', () => {
  const r = run(setup(), ['trigger', 'research'])   // nothing enabled yet
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /No active skill/i)
})

test('trigger: single active match → dumps content', () => {
  const h = setup()
  run(h, ['enable', 'deep-research', '-g'])
  const out = strip(run(h, ['trigger', 'research']).out)
  assert.match(out, /Deep Research/)
})

test('trigger: multiple active matches → candidate list', () => {
  const h = setup()
  run(h, ['enable', 'deep-research', '-g'])
  run(h, ['enable', 'paper-search', '-g'])
  const out = strip(run(h, ['trigger', 'research']).out)
  assert.match(out, /matched 2 skills|pick one/i)
  assert.match(out, /deep-research/)
  assert.match(out, /paper-search/)
})

test('trigger: passive (installed, not enabled) skill does NOT trigger', () => {
  const h = setup()
  // neither enabled
  const out = strip(run(h, ['trigger', 'research']).out)
  assert.doesNotMatch(out, /Deep Research/)
  assert.match(out, /No active skill/i)
})

test('trigger: case-insensitive keyword (/Research works)', () => {
  const h = setup()
  run(h, ['enable', 'deep-research', '-g'])
  const out = strip(run(h, ['trigger', '/Research']).out)
  assert.match(out, /Deep Research/)
})

test('trigger: accepts leading-slash form (/research)', () => {
  const h = setup()
  run(h, ['enable', 'deep-research', '-g'])
  assert.match(strip(run(h, ['trigger', '/research']).out), /Deep Research/)
})

test('trigger: BOM-prefixed store skill still triggers (M2)', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  const dir = path.join(h, '.skill-cli', 'store', 'bom-skill')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'SKILL.md'),
    '\uFEFF---\nname: bom-skill\ndescription: b\nversion: 1.0.0\ntriggers: [bomcheck]\n---\n# BOM Body\n')
  run(h, ['enable', 'bom-skill', '-g'])
  assert.match(strip(run(h, ['trigger', 'bomcheck']).out), /BOM Body/)
})

test('trigger: reads CANONICAL name (M1 — does not crash on name lookup)', () => {
  // a skill whose name has mixed casing; trigger resolves via name, not dir
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'React-BP', { triggers: ['bp'] }, '# React BP')
  run(h, ['enable', 'react-bp', '-g'])   // lowercase enable, canonical React-BP
  const out = strip(run(h, ['trigger', 'bp']).out)
  assert.match(out, /React BP/)
})
