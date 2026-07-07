// Shared test helpers for the skill-cli test suite. Each test gets an isolated
// SKILL_CLI_HOME (a temp dir) so nothing touches the real ~/. All CLI runs spawn
// a fresh node process with that HOME, giving true isolation.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const ROOT = path.resolve(import.meta.dirname, '..')
export const CLI_PATH = path.join(ROOT, 'src', 'cli.js')

// strip ANSI color codes so assertions match plain text
export const strip = (s) => String(s ?? '').replace(/\x1b\[[0-9;]*m/g, '')

// fresh isolated home; pre-creates .claude so `init -g` has somewhere to inject
export function mkHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'))
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true })
  return home
}

// run the CLI against `home`; returns { out, err, code } (code=0 on success).
// `env` is merged in (used to set SKILL_CLI_FETCH_FIXTURE for install/update tests).
export function run(home, args, env = {}, input = undefined) {
  try {
    const out = execFileSync('node', [CLI_PATH, ...args], {
      cwd: home,
      env: { ...process.env, SKILL_CLI_HOME: home, MSYS_NO_PATHCONV: '1', ...env },
      input,
      encoding: 'utf8',
    })
    return { out, err: '', code: 0 }
  } catch (e) {
    return {
      out: (e.stdout || '').toString(),
      err: (e.stderr || e.message || '').toString(),
      code: e.status ?? 1,
    }
  }
}

// Build a local source tree (dir of skill dirs) that `skill install <path>` can
// fetch via npx skills add. Returns the root path to pass to install.
export function mkSource(home, label, skills) {
  const root = path.join(home, label)
  for (const s of skills) {
    const dir = path.join(root, s.dir || s.name)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'SKILL.md'), skillMd(s))
  }
  return root
}

// Write a skill directly into the store (bypassing npx) — for testing read/list/
// trigger/show/cat without the fetch round-trip.
export function putStoreSkill(home, name, fields = {}, body = '# Body') {
  const dir = path.join(home, '.skill-cli', 'store', name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'SKILL.md'), skillMd({ name, body, ...fields }))
  return dir
}

// Render a SKILL.md string from a loose spec { name, version, description,
// triggers, body, ...extra frontmatter keys }.
export function skillMd(s) {
  const fm = {
    name: s.name,
    version: s.version || '1.0.0',
    ...(s.description ? { description: s.description } : {}),
    ...(s.triggers ? { triggers: s.triggers } : {}),
    ...(s.extra || {}),
  }
  const yaml = Object.entries(fm)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(', ')}]` : v}`).join('\n')
  return `---\n${yaml}\n---\n${s.body || '# Body'}\n`
}
