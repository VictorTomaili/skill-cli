// npx unit tests — input validation (no network) + the fake-fetch seam.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fetchSkillsToTemp } from '../../src/lib/npx.js'

// validation guards run BEFORE mkdtemp/exec, so these never touch the network
test('empty source throws', () => {
  assert.throws(() => fetchSkillsToTemp(''), /empty source/)
  assert.throws(() => fetchSkillsToTemp('   '), /empty source/)
  assert.throws(() => fetchSkillsToTemp(null), /empty source/)
})

test('multiline source throws', () => {
  assert.throws(() => fetchSkillsToTemp('a\nb'), /single line/)
  assert.throws(() => fetchSkillsToTemp('a\rb'), /single line/)
})

test('source is trimmed before validation', () => {
  // whitespace-only → empty after trim → throws
  assert.throws(() => fetchSkillsToTemp('  \n  '), /empty source|single line/)
})

// ── fake-fetch seam (SKILL_CLI_FETCH_FIXTURE) ───────────────────────────────
test('FAKE mode: copies fixture skill dirs into temp, no network', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-'))
  fs.mkdirSync(path.join(fixture, 'my-skill'), { recursive: true })
  fs.writeFileSync(path.join(fixture, 'my-skill', 'SKILL.md'), '---\nname: x\n---\nbody')
  process.env.SKILL_CLI_FETCH_FIXTURE = fixture
  try {
    const { tmp, fetchedDir } = fetchSkillsToTemp('ignored-arg')
    assert.ok(fs.existsSync(path.join(fetchedDir, 'my-skill', 'SKILL.md')))
    assert.equal(path.basename(path.dirname(fetchedDir)), '.claude')  // mirrors npx layout
    fs.rmSync(tmp, { recursive: true, force: true })
  } finally {
    delete process.env.SKILL_CLI_FETCH_FIXTURE
  }
})

test('FAKE mode: nonexistent fixture → empty fetchedDir (no throw)', () => {
  process.env.SKILL_CLI_FETCH_FIXTURE = path.join(os.tmpdir(), 'definitely-missing-' + Date.now())
  try {
    const { tmp, fetchedDir } = fetchSkillsToTemp('ignored')
    assert.ok(fs.existsSync(fetchedDir))
    assert.equal(fs.readdirSync(fetchedDir).length, 0)
    fs.rmSync(tmp, { recursive: true, force: true })
  } finally {
    delete process.env.SKILL_CLI_FETCH_FIXTURE
  }
})

test('FAKE mode: multi-skill fixture copies all', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'fix-'))
  for (const n of ['a', 'b', 'c']) {
    fs.mkdirSync(path.join(fixture, n), { recursive: true })
    fs.writeFileSync(path.join(fixture, n, 'SKILL.md'), `---\nname: ${n}\n---\n`)
  }
  process.env.SKILL_CLI_FETCH_FIXTURE = fixture
  try {
    const { tmp, fetchedDir } = fetchSkillsToTemp('ignored')
    assert.deepEqual(fs.readdirSync(fetchedDir).sort(), ['a', 'b', 'c'])
    fs.rmSync(tmp, { recursive: true, force: true })
  } finally {
    delete process.env.SKILL_CLI_FETCH_FIXTURE
  }
})
