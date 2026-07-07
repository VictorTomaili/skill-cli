// OPTIONAL end-to-end test of the REAL npx fetch path.
//
// Unlike `npm test` (which is fully network-free via the SKILL_CLI_FETCH_FIXTURE
// seam), this spawns a genuine `npx skills add` — exercising execFileSync, the
// Windows cmd.exe /c assembly, the timeout path, and cpSync-to-store against a
// real `npx skills` invocation. It needs network (npx resolves the `skills`
// package), so it is NOT part of the default test suite.
//
// Run manually before a release:   npm run test:e2e
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-e2e-'))
const strip = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '')

function cli(args) {
  return execFileSync('node', [path.join(ROOT, 'src', 'cli.js'), ...args], {
    cwd: HOME,
    env: { ...process.env, SKILL_CLI_HOME: HOME, MSYS_NO_PATHCONV: '1' },   // NOTE: no SKILL_CLI_FETCH_FIXTURE → real npx
    encoding: 'utf8',
  })
}

let pass = 0, fail = 0
const ok = (n, c) => { c ? (pass++, console.log('  ✓ ' + n)) : (fail++, console.error('  ✗ ' + n)) }

// a local skill source that the real `npx skills add <path>` can consume
const src = path.join(HOME, 'src')
fs.mkdirSync(path.join(src, 'e2e-skill'), { recursive: true })
fs.writeFileSync(path.join(src, 'e2e-skill', 'SKILL.md'),
  '---\nname: e2e-real\ndescription: e2e\nversion: 1.0.0\ntriggers: [e2e]\n---\n# E2E Real\n')

console.log('skill-cli E2E (REAL npx path)   HOME=' + HOME)
console.log('(requires network to resolve the `skills` npm package)\n')

try {
  fs.mkdirSync(path.join(HOME, '.claude'), { recursive: true })
  cli(['init', '-g'])
  console.log('  init -g ✓')
  const out = cli(['install', src])
  ok('real fetch lands skill in store', fs.existsSync(path.join(HOME, '.skill-cli', 'store', 'e2e-real', 'SKILL.md')))
  ok('.source recorded', fs.existsSync(path.join(HOME, '.skill-cli', 'store', 'e2e-real', '.source')))
  cli(['enable', 'e2e-real', '-g'])
  ok('trigger works on real-installed skill', /E2E Real/.test(strip(cli(['trigger', 'e2e']))))
} catch (e) {
  fail++
  const tail = ((e.stderr || e.stdout || e.message || '').toString().trim().split('\n').pop())
  console.error('  ✗ E2E failed: ' + tail)
  console.error('    (npx/network unavailable? this test is opt-in for exactly this reason)')
}

console.log('\n' + pass + ' passed, ' + fail + ' failed')
fs.rmSync(HOME, { recursive: true, force: true })
process.exit(fail ? 1 : 0)
