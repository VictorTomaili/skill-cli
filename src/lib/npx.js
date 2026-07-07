import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Fetch skill(s) from `source` into a TEMP cwd via `npx skills add --copy`.
// Output lands in <tmp>/.claude/skills/ — never in real agent dirs. The caller
// owns the returned `tmp` and MUST rmSync(tmp, {recursive,force}) in a finally.
//
// shell:false + args array (no injection). On Windows, Node 20+ refuses to spawn
// .cmd without a shell, so we route through `cmd.exe /c` which resolves npx.
export function fetchSkillsToTemp(source) {
  // Test seam: when SKILL_CLI_FETCH_FIXTURE is set, copy a local fixture tree
  // instead of spawning npx. Lets install/update run with zero network.
  // Production never sets this env var.
  const fixture = process.env.SKILL_CLI_FETCH_FIXTURE
  if (fixture) return fetchFromFixture(fixture)

  const safe = String(source ?? '').trim()
  if (!safe) throw new Error('empty source')
  if (/[\r\n]/.test(safe)) throw new Error('source must be a single line')

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-cli-'))
  const isWin = process.platform === 'win32'
  const cmd = isWin ? 'cmd.exe' : 'npx'
  const args = isWin
    ? ['/c', 'npx', '-y', 'skills', 'add', safe, '--copy', '--agent', 'claude-code', '--skill', '*', '-y']
    : ['-y', 'skills', 'add', safe, '--copy', '--agent', 'claude-code', '--skill', '*', '-y']

  try {
    execFileSync(cmd, args, {
      cwd: tmp,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: false,
      timeout: 180000, // npx first-run + git clone can be slow; don't hang forever
      env: { ...process.env, CI: '1' },
    })
  } catch (e) {
    fs.rmSync(tmp, { recursive: true, force: true })
    const timedOut = e.signal === 'SIGTERM' || e.code === 'ETIMEDOUT'
    const tail = timedOut ? '' : ((e.stderr || e.stdout) || '').toString().trim().split('\n').pop()
    const msg = timedOut
      ? 'fetch timed out after 3 min (network too slow or source too large?)'
      : 'fetch failed: ' + (tail || e.message)
    const err = new Error(msg)
    err.cause = e
    throw err
  }

  const fetchedDir = path.join(tmp, '.claude', 'skills')
  if (!fs.existsSync(fetchedDir)) {
    fs.rmSync(tmp, { recursive: true, force: true })
    throw new Error('no skills found in source after fetch')
  }
  return { tmp, fetchedDir }
}

// Fixture-backed fetch. The fixture is a dir of skill dirs — the same layout npx
// produces under .claude/skills/. Mirror it into a temp so install/update behave
// identically to the real path, with no network.
function fetchFromFixture(fixture) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-cli-'))
  const fetchedDir = path.join(tmp, '.claude', 'skills')
  fs.mkdirSync(fetchedDir, { recursive: true })
  if (fs.existsSync(fixture)) {
    for (const entry of fs.readdirSync(fixture, { withFileTypes: true })) {
      if (entry.isDirectory()) fs.cpSync(path.join(fixture, entry.name), path.join(fetchedDir, entry.name), { recursive: true })
    }
  }
  return { tmp, fetchedDir }
}
