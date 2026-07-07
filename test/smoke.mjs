// End-to-end smoke test. Runs against an isolated SKILL_CLI_HOME so the real ~ is
// never touched. Exits non-zero on any failure. Run with: npm test
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-smoke-'))
const CLI = (args) => execFileSync('node', [path.join(ROOT, 'src', 'cli.js'), ...args], {
  cwd: HOME, env: { ...process.env, SKILL_CLI_HOME: HOME, MSYS_NO_PATHCONV: '1' },
  encoding: 'utf8',
})

let pass = 0, fail = 0
function ok(name, cond) { cond ? (pass++, console.log('  ✓ ' + name)) : (fail++, console.error('  ✗ ' + name)) }
function run(fn) { try { fn() } catch (e) { fail++; console.error('  ✗ threw: ' + e.message) } }

console.log('skill-cli smoke test  (HOME=' + HOME + ')\n')

// --- prepare a local skill source to install from ---
const src = path.join(HOME, 'src-skill')
fs.mkdirSync(path.join(src, 'my-skill'), { recursive: true })
fs.writeFileSync(path.join(src, 'my-skill', 'SKILL.md'),
`---
name: deep-research
description: Deep source-research workflow
version: 1.0.0
triggers: [research]
---
# Deep Research v1
Initial body.
`)

console.log('init -g')
run(() => {
  fs.mkdirSync(path.join(HOME, '.claude'), { recursive: true })
  const out = CLI(['init', '-g'])
  ok('store created', fs.existsSync(path.join(HOME, '.skill-cli', 'store')))
  ok('config.yaml created', fs.existsSync(path.join(HOME, '.skill-cli', 'config.yaml')))
  ok('AGENTS block injected to CLAUDE.md', fs.readFileSync(path.join(HOME, '.claude', 'CLAUDE.md'), 'utf8').includes('BEGIN skill-cli'))
})

console.log('install <local-path>')
run(() => {
  CLI(['install', src])
  ok('skill in store', fs.existsSync(path.join(HOME, '.skill-cli', 'store', 'deep-research', 'SKILL.md')))
  ok('.source recorded', fs.existsSync(path.join(HOME, '.skill-cli', 'store', 'deep-research', '.source')))
})

console.log('list (passive) + enable -g + list (active)')
run(() => {
  const before = CLI(['list'])
  ok('passive before enable', /○.*deep-research/.test(before.replace(/\x1b\[[0-9;]*m/g, '')))
  CLI(['enable', 'deep-research', '-g'])
  const after = CLI(['list'])
  ok('active after enable', /●.*deep-research/.test(after.replace(/\x1b\[[0-9;]*m/g, '')))
})

console.log('case-insensitivity (B1/B2 regression)')
run(() => {
  CLI(['enable', 'Deep-Research', '-g'])  // mixed-case — must not duplicate
  const cfg = fs.readFileSync(path.join(HOME, '.skill-cli', 'config.yaml'), 'utf8')
  const hits = (cfg.match(/deep-research/gi) || [])
  ok('no duplicate in enabled_global', hits.length === 1)
  const show = CLI(['show', 'DEEP-RESEARCH'])  // case-insensitive read (B2)
  ok('show by upper-case name works', /deep-research/i.test(show))
})

console.log('trigger')
run(() => {
  const single = CLI(['trigger', 'research'])
  ok('single match dumps content', /Deep Research v1/.test(single))
})

console.log('update (change source → updated; again → up to date)')
run(() => {
  fs.writeFileSync(path.join(src, 'my-skill', 'SKILL.md'),
`---
name: deep-research
description: Deep source-research workflow, revised
version: 2.0.0
triggers: [research]
---
# Deep Research v2
Revised body.
`)
  const u1 = CLI(['update'])
  ok('update detects change', /1\.0\.0 → 2\.0\.0/.test(u1))
  const u2 = CLI(['update'])
  ok('update idempotent', /up to date/.test(u2))
})

console.log('allowlist (deny ["*"] + allow)')
run(() => {
  fs.writeFileSync(path.join(HOME, 'skill.config'), 'inherit: true\ndeny: ["*"]\nallow: [deep-research]\n')
  const out = CLI(['list'])
  const clean = out.replace(/\x1b\[[0-9;]*m/g, '')
  ok('allowed skill active under deny:*', /●.*deep-research/.test(clean))
})

console.log()
console.log(`\n${pass} passed, ${fail} failed`)
fs.rmSync(HOME, { recursive: true, force: true })
process.exit(fail ? 1 : 0)
