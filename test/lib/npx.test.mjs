// npx unit tests — input validation (no network) + the fake-fetch seam.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fetchSkillsToTemp, buildNpxSpawn } from '../../src/lib/npx.js'

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

// ── buildNpxSpawn: cross-platform command assembly ─────────────────────────
// Locks the per-platform branching so npx works on Windows, Linux, and macOS.
test('buildNpxSpawn: win32 → cmd.exe /c npx (CVE-2024-27980 workaround)', () => {
  const { cmd, args } = buildNpxSpawn('owner/repo', 'win32')
  assert.equal(cmd, 'cmd.exe')
  assert.deepEqual(args, ['/c', 'npx', '-y', 'skills', 'add', 'owner/repo', '--copy', '--agent', 'claude-code', '--skill', '*', '-y'])
})

test('buildNpxSpawn: linux → npx direct (no shell, no /c)', () => {
  const { cmd, args } = buildNpxSpawn('owner/repo', 'linux')
  assert.equal(cmd, 'npx')
  assert.equal(args[0], '-y')
  assert.ok(!args.includes('/c'))
})

test('buildNpxSpawn: darwin → npx direct', () => {
  assert.equal(buildNpxSpawn('x', 'darwin').cmd, 'npx')
})

test('buildNpxSpawn: WSL reports linux → npx direct (not cmd.exe)', () => {
  // WSL runs a real Linux node; process.platform is 'linux' even on a Windows host
  assert.equal(buildNpxSpawn('x', 'linux').cmd, 'npx')
})

test('buildNpxSpawn: source is one argv element — no shell injection surface', () => {
  const nasty = 'a&b | $HOME; rm -rf /'
  const { args } = buildNpxSpawn(nasty, 'linux')
  assert.ok(args.includes(nasty))            // passed through verbatim
  assert.equal(args.filter(a => a === nasty).length, 1)
})

test('buildNpxSpawn: "*" stays literal (shell never expands globs)', () => {
  assert.ok(buildNpxSpawn('x', 'linux').args.includes('*'))
  assert.ok(buildNpxSpawn('x', 'win32').args.includes('*'))
})

test('buildNpxSpawn: two -y flags (npx install + skills add prompts)', () => {
  for (const p of ['win32', 'linux', 'darwin']) {
    const ys = buildNpxSpawn('x', p).args.filter(a => a === '-y').length
    assert.equal(ys, 2, p)
  }
})

test('buildNpxSpawn: defaults to current process.platform', () => {
  // same shape whether platform is passed or omitted (uses process.platform)
  assert.equal(buildNpxSpawn('x').cmd, buildNpxSpawn('x', process.platform).cmd)
})
