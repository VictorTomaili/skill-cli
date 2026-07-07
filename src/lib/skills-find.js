import { execFileSync } from 'node:child_process'

// Parse the output of `npx skills find <query>` into structured results.
// Output shape (after ANSI strip):
//     owner/repo@skill   25.7K installs
//     └ https://skills.sh/owner/repo/skill
// Pure + exported so it is unit-testable without spawning npx.
export function parseFind(raw) {
  const clean = String(raw == null ? '' : raw).replace(/\x1b\[[0-9;]*m/g, '')
  const lines = clean.split(/\r?\n/)
  const out = []
  const srcRe = /^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)@([A-Za-z0-9._-]+)\s+([0-9.]+[KM]?)?\s*installs\b/
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(srcRe)
    if (!m) continue
    const [, owner, repo, skill, installs] = m
    const urlM = (lines[i + 1] || '').match(/https:\/\/\S+/)
    out.push({
      source: `${owner}/${repo}@${skill}`,
      owner, repo, skill,
      installs: installs || '',
      url: urlM ? urlM[0] : '',
    })
  }
  return out
}

// Run `npx skills find <query>` non-interactively (empty stdin, CI=1) and parse.
// Cross-platform: Windows spawns via cmd.exe (Node CVE-2024-27980 refuses npx.cmd
// with shell:false). The query is validated to a safe charset so it never reaches
// cmd.exe's metachar surface (& | < > etc.).
export function searchSkills(query) {
  const q = String(query || '').trim()
  if (!q) return []
  if (/[^A-Za-z0-9 .\/_-]/.test(q)) {
    throw new Error('search query may only contain letters, numbers, spaces, and . / _ -')
  }
  const isWin = process.platform === 'win32'
  const cmd = isWin ? 'cmd.exe' : 'npx'
  const args = isWin ? ['/c', 'npx', '-y', 'skills', 'find', q] : ['-y', 'skills', 'find', q]
  let raw
  try {
    raw = execFileSync(cmd, args, {
      input: '',
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: false,
      timeout: 60000,
      env: { ...process.env, CI: '1' },
    })
  } catch (e) {
    if (e.code === 'ENOENT') throw new Error('npx not found on PATH — is Node.js installed?')
    const timedOut = e.signal === 'SIGTERM' || e.code === 'ETIMEDOUT'
    if (timedOut) throw new Error('search timed out after 60s (network too slow?)')
    throw new Error('skills find failed: ' + (((e.stderr || e.stdout || '').toString().trim().split('\n').pop()) || e.message))
  }
  return parseFind(raw)
}
