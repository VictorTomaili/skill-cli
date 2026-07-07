import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Fetch skill(s) from `source` into a TEMP cwd via `npx skills add --copy`.
// Output lands in <tmp>/.claude/skills/ — never in real agent dirs. The caller
// owns the returned `tmp` and MUST rmSync(tmp, {recursive,force}) in a finally.
//
// Assemble the spawn target for `npx skills add` so it runs safely on every
// platform. Pure + exported so the per-platform branching is unit-testable.
//
// Windows (process.platform === 'win32', incl. Git Bash / Cygwin / MSYS — Node
// still reports 'win32'): Node 20+ (CVE-2024-27980) refuses to spawn .cmd/.bat
// files such as npx.cmd with shell:false. We spawn cmd.exe (a real .exe) and let
// it resolve npx via `cmd.exe /c npx ...`.
//
// Linux / macOS / WSL: npx is a real executable on PATH (ships with npm/node),
// spawned directly.
//
// On ALL platforms we use shell:false with an args array, so the source is passed
// as a single argv element — no shell injection — and `--skill *` stays literal
// (cmd.exe does no globbing and no POSIX shell is ever involved). npx must be on
// PATH; it ships with node/npm on every platform.
// Detect a `@skill` pin on the source (skills ecosystem: owner/repo@skill or a
// URL@skill). SSH git URLs (`git@host:owner/repo`) start with git@ and are NOT a
// pin. When the source is pinned we must NOT pass `--skill '*'` — that flag
// overrides the pin and fetches every skill in the repo (verified), so a search
// result like owner/repo@research would otherwise dump the whole repo.
export function skillPin(source) {
  if (typeof source !== 'string') return null
  if (source.startsWith('git@')) return null
  const at = source.lastIndexOf('@')
  if (at <= 0) return null
  const skill = source.slice(at + 1)
  if (!skill || skill.includes('/') || skill.includes(':')) return null
  return skill
}

export function buildNpxSpawn(source, platform = process.platform) {
  // pinned source (owner/repo@skill) → let the @pin select the skill (passing
  // --skill '*' here would override it and grab the whole repo). Otherwise fetch all.
  const skillArgs = skillPin(source) ? [] : ['--skill', '*']
  const base = ['-y', 'skills', 'add', source, '--copy', '--agent', 'claude-code', ...skillArgs, '-y']
  return platform === 'win32'
    ? { cmd: 'cmd.exe', args: ['/c', 'npx', ...base] }
    : { cmd: 'npx', args: base }
}

// Fetch skill(s) from `source` into a TEMP cwd via `npx skills add --copy`.
// Output lands in <tmp>/.claude/skills/ — never in real agent dirs. The caller
// owns the returned `tmp` and MUST rmSync(tmp, {recursive,force}) in a finally.
export function fetchSkillsToTemp(source) {
  // Test seam: when SKILL_CLI_FETCH_FIXTURE is set, copy a local fixture tree
  // instead of spawning npx. Lets install/update run with zero network.
  // Production never sets this env var.
  const fixture = process.env.SKILL_CLI_FETCH_FIXTURE
  if (fixture) return fetchFromFixture(fixture)

  const safe = String(source ?? '').trim()
  if (!safe) throw new Error('empty source')
  if (/[\r\n]/.test(safe)) throw new Error('source must be a single line')
  // B5: defense-in-depth on Windows. The source reaches `cmd.exe /c npx … <source>`;
  // cmd.exe parses shell metacharacters even though we spawn with shell:false
  // (cmd.exe IS a shell). Real sources (owner/repo, URL, git URL, npm name, local
  // path) never contain these, so reject loudly rather than risk cmd interpreting.
  if (process.platform === 'win32' && /[&|<>^]/.test(safe)) {
    throw new Error('source contains Windows shell metacharacters (& | < > ^) — use a path/URL without them')
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-cli-'))
  const { cmd, args } = buildNpxSpawn(safe)

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
    let msg
    if (e.code === 'ENOENT') {
      // npx/node not on PATH — same message on every platform
      msg = 'npx not found on PATH — is Node.js (with npm) installed?'
    } else {
      const timedOut = e.signal === 'SIGTERM' || e.code === 'ETIMEDOUT'
      const tail = timedOut ? '' : ((e.stderr || e.stdout) || '').toString().trim().split('\n').pop()
      msg = timedOut
        ? 'fetch timed out after 3 min (network too slow or source too large?)'
        : 'fetch failed: ' + (tail || e.message)
    }
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
