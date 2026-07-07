// End-to-end smoke test. Runs against an isolated SKILL_CLI_HOME so the real ~ is
// never touched. Exits non-zero on any failure. Run with: npm test
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-smoke-'))
const strip = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '')

// run CLI; returns { out, code } (code=0 on success). stdout/stderr captured separately.
function CLI(args) {
  try {
    const out = execFileSync('node', [path.join(ROOT, 'src', 'cli.js'), ...args], {
      cwd: HOME, env: { ...process.env, SKILL_CLI_HOME: HOME, MSYS_NO_PATHCONV: '1' },
      encoding: 'utf8',
    })
    return { out, err: '', code: 0 }
  } catch (e) {
    return { out: (e.stdout || '').toString(), err: (e.stderr || e.message || '').toString(), code: e.status ?? 1 }
  }
}

let pass = 0, fail = 0
function ok(name, cond) { cond ? (pass++, console.log('  ✓ ' + name)) : (fail++, console.error('  ✗ ' + name)) }

console.log('skill-cli smoke test  (HOME=' + HOME + ')\n')

// --- two local skill sources (both carry the `research` trigger → multi-match) ---
const src1 = path.join(HOME, 'src1', 'my-skill')
const src2 = path.join(HOME, 'src2', 'paper-skill')
fs.mkdirSync(src1, { recursive: true })
fs.mkdirSync(src2, { recursive: true })
fs.writeFileSync(path.join(src1, 'SKILL.md'),
`---
name: deep-research
description: Deep source-research workflow
version: 1.0.0
triggers: [research]
---
# Deep Research v1
Initial body.
`)
fs.writeFileSync(path.join(src2, 'SKILL.md'),
`---
name: paper-search
description: Academic paper search
version: 0.9.0
triggers: [research]
---
# Paper Search
arXiv search.
`)

console.log('init -g')
{
  fs.mkdirSync(path.join(HOME, '.claude'), { recursive: true })
  const r = CLI(['init', '-g'])
  ok('store created', fs.existsSync(path.join(HOME, '.skill-cli', 'store')))
  ok('config.yaml created', fs.existsSync(path.join(HOME, '.skill-cli', 'config.yaml')))
  ok('AGENTS block injected', fs.readFileSync(path.join(HOME, '.claude', 'CLAUDE.md'), 'utf8').includes('BEGIN skill-cli'))
  ok('init exits 0', r.code === 0)
}

console.log('install <local-path> x2')
{
  ok('deep-research installed', CLI(['install', src1]).code === 0)
  ok('paper-search installed', CLI(['install', src2]).code === 0)
  ok('.source recorded', fs.existsSync(path.join(HOME, '.skill-cli', 'store', 'deep-research', '.source')))
}

console.log('list passive + enable -g + list active')
{
  ok('passive before enable', /○.*deep-research/.test(strip(CLI(['list']).out)))
  CLI(['enable', 'deep-research', '-g'])
  ok('active after enable', /●.*deep-research/.test(strip(CLI(['list']).out)))
}

console.log('case-insensitivity (B1/B2 regression)')
{
  CLI(['enable', 'Deep-Research', '-g'])  // mixed-case — must not duplicate
  const cfg = fs.readFileSync(path.join(HOME, '.skill-cli', 'config.yaml'), 'utf8')
  const hits = (cfg.match(/deep-research/gi) || [])
  ok('no duplicate in enabled_global', hits.length === 1)
  ok('show by upper-case name (B2)', CLI(['show', 'DEEP-RESEARCH']).code === 0)
}

console.log('trigger single → content')
ok('single match dumps content', /Deep Research v1/.test(strip(CLI(['trigger', 'research']).out)))

console.log('multi-trigger → candidates (2nd research skill enabled)')
{
  CLI(['enable', 'paper-search', '-g'])
  const out = strip(CLI(['trigger', 'research']).out)
  ok('candidates list on multi-match', /matched 2 skills|pick one/i.test(out))
}

console.log('trigger none → info (exit 0, not error)')
ok('no-match is informational', CLI(['trigger', 'nope']).code === 0)

console.log('N4: enable nonexistent → error (UX guard against typos)')
{
  const r = CLI(['enable', 'typo-skill', '-g'])
  ok('enable typo exits non-zero', r.code !== 0)
  ok('mentions install hint', /install/i.test(r.err + r.out))
}

console.log('disable + idempotent disable')
{
  CLI(['disable', 'paper-search', '-g'])
  ok('disabled → passive', /○.*paper-search/.test(strip(CLI(['list']).out)))
  const r = CLI(['disable', 'paper-search', '-g'])
  ok('disable-again → nothing to do', /nothing to do/i.test(strip(r.out)))
}

console.log('not-found paths (show/cat)')
{
  ok('show nonexistent → error', CLI(['show', 'nope']).code !== 0)
  ok('cat nonexistent → error', CLI(['cat', 'nope']).code !== 0)
}

console.log('N3: path traversal rejected (store.js)')
{
  ok('cat ".." rejected (no traversal)', CLI(['cat', '..']).code !== 0)
  ok('cat "../etc/passwd" rejected', CLI(['cat', '../etc/passwd']).code !== 0)
}

console.log('M2: BOM-prefixed SKILL.md (Windows regression)')
{
  // write directly into the store (an editor that saves with a BOM); npx itself
  // rejects a BOM at fetch time, but a hand-edited store skill must still parse.
  const dir = path.join(HOME, '.skill-cli', 'store', 'bom-test')
  fs.mkdirSync(dir, { recursive: true })
  const md = '---\nname: bom-test\ndescription: BOM test\nversion: 1.0.0\ntriggers: [bomcheck]\n---\n# BOM Skill\nbody.\n'
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '\uFEFF' + md)
  CLI(['enable', 'bom-test', '-g'])
  ok('BOM triggers parsed (frontmatter read)', /BOM Skill/.test(strip(CLI(['trigger', 'bomcheck']).out)))
}

console.log('update detects change + idempotent')
{
  fs.writeFileSync(path.join(src1, 'SKILL.md'),
`---
name: deep-research
description: Deep source-research workflow, revised
version: 2.0.0
triggers: [research]
---
# Deep Research v2
Revised body.
`)
  const u1 = strip(CLI(['update']).out)
  ok('update detects change', /1\.0\.0 → 2\.0\.0/.test(u1))
  const u2 = strip(CLI(['update']).out)
  ok('update idempotent', /up to date/.test(u2))
}

console.log('allowlist (deny ["*"] + allow)')
{
  fs.writeFileSync(path.join(HOME, 'skill.config'), 'inherit: true\ndeny: ["*"]\nallow: [deep-research]\n')
  ok('allowed skill active under deny:*', /●.*deep-research/.test(strip(CLI(['list']).out)))
}

console.log()
console.log(`\n${pass} passed, ${fail} failed`)
fs.rmSync(HOME, { recursive: true, force: true })
process.exit(fail ? 1 : 0)
