import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mkHome, run, strip } from '../helpers.mjs'

test('init -g: creates store + config + injects AGENTS block into CLAUDE.md', () => {
  const h = mkHome()
  const r = run(h, ['init', '-g'])
  assert.equal(r.code, 0)
  assert.ok(fs.existsSync(path.join(h, '.skill-cli', 'store')))
  assert.ok(fs.existsSync(path.join(h, '.skill-cli', 'config.yaml')))
  assert.match(fs.readFileSync(path.join(h, '.claude', 'CLAUDE.md'), 'utf8'), /BEGIN skill-cli/)
})

test('init -g: idempotent — AGENTS block not duplicated', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  run(h, ['init', '-g'])
  const content = fs.readFileSync(path.join(h, '.claude', 'CLAUDE.md'), 'utf8')
  assert.equal((content.match(/BEGIN skill-cli/g) || []).length, 1)
})

test('init -g: injects into codex + gemini + pi when their dirs exist', () => {
  const h = mkHome()
  fs.mkdirSync(path.join(h, '.codex'), { recursive: true })
  fs.mkdirSync(path.join(h, '.gemini'), { recursive: true })
  fs.mkdirSync(path.join(h, '.pi', 'agent'), { recursive: true })
  run(h, ['init', '-g'])
  assert.match(fs.readFileSync(path.join(h, '.codex', 'AGENTS.md'), 'utf8'), /skill-cli/)
  assert.match(fs.readFileSync(path.join(h, '.gemini', 'GEMINI.md'), 'utf8'), /skill-cli/)
  assert.match(fs.readFileSync(path.join(h, '.pi', 'agent', 'AGENTS.md'), 'utf8'), /skill-cli/)
})

test('init -g: pi uses the nested ~/.pi/agent dir (skipped if only ~/.pi exists)', () => {
  const h = mkHome()
  fs.mkdirSync(path.join(h, '.pi'), { recursive: true }) // no agent/ subdir yet
  const r = run(h, ['init', '-g'])
  assert.equal(r.code, 0)
  assert.ok(!fs.existsSync(path.join(h, '.pi', 'agent', 'AGENTS.md')))
})

test('init -g: skips agents whose dir does not exist', () => {
  const h = mkHome()
  const r = run(h, ['init', '-g'])
  assert.equal(r.code, 0)
  assert.ok(!fs.existsSync(path.join(h, '.codex', 'AGENTS.md')))
})

test('init -g: updates block content if re-run (replaces, not appends)', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  const f = path.join(h, '.claude', 'CLAUDE.md')
  const before = fs.readFileSync(f, 'utf8')
  // corrupt the block, re-init, ensure it's restored cleanly (single block)
  fs.writeFileSync(f, before + '\n## extra\n')
  run(h, ['init', '-g'])
  const after = fs.readFileSync(f, 'utf8')
  assert.equal((after.match(/BEGIN skill-cli/g) || []).length, 1)
  assert.match(after, /extra/)
})

test('init (project): creates skill.config in cwd', () => {
  const h = mkHome()
  const r = run(h, ['init'])
  assert.equal(r.code, 0)
  assert.ok(fs.existsSync(path.join(h, 'skill.config')))
})

test('init (project): already-exists is reported, not overwritten', () => {
  const h = mkHome()
  run(h, ['init'])
  fs.writeFileSync(path.join(h, 'skill.config'), 'inherit: false\n')
  const r = run(h, ['init'])
  assert.match(strip(r.out), /already exists/)
  assert.equal(fs.readFileSync(path.join(h, 'skill.config'), 'utf8'), 'inherit: false\n')
})
