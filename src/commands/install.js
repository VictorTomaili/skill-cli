import fs from 'node:fs'
import path from 'node:path'
import c from 'picocolors'
import { STORE_DIR } from '../lib/paths.js'
import { parseSkillMd } from '../lib/frontmatter.js'
import { fetchSkillsToTemp } from '../lib/npx.js'
import { sanitizeSkillName } from '../lib/store.js'

// Local paths are resolved to absolute BEFORE switching to the temp cwd, so
// npx skills looks them up relative to the user's cwd, not the temp dir.
function resolveSource(source) {
  if (/:\/\//.test(source) || source.startsWith('git@')) return source
  if (fs.existsSync(source)) return path.resolve(source)
  return source
}

// Fetch skill(s) from ANY source `npx skills` understands — github owner/repo,
// full GitHub/GitLab URL, git URL, local path, npm package — into a TEMP cwd,
// then move the files into our store. Agent folders stay untouched.
export function cmdInstall(args) {
  const source = args[0]
  if (!source) {
    console.error(c.red('Usage: skill install <source>'))
    console.error(c.gray('  source: owner/repo | github/gitlab URL | git URL | local path | npm package'))
    process.exit(1)
  }

  const resolved = resolveSource(source)
  console.log(c.cyan('Fetching: ') + resolved)
  console.log(c.gray('  via npx skills add (temp cwd; agent folders untouched)'))

  let tmp, fetchedDir
  try {
    ({ tmp, fetchedDir } = fetchSkillsToTemp(resolved))
  } catch (e) {
    console.error(c.red(e.message))
    console.error(c.gray('Check the source (owner/repo, URL, path, npm package).'))
    process.exit(1)
  }

  try {
    fs.mkdirSync(STORE_DIR, { recursive: true })
    const moved = []
    const skipped = []
    for (const entry of fs.readdirSync(fetchedDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const srcSkillDir = path.join(fetchedDir, entry.name)
      const mdPath = path.join(srcSkillDir, 'SKILL.md')
      let raw = entry.name
      if (fs.existsSync(mdPath)) {
        try {
          const { data } = parseSkillMd(fs.readFileSync(mdPath, 'utf8'))
          if (data.name) raw = data.name
        } catch { /* fall back to dir name */ }
      }
      // S1 (path traversal): the dest name is untrusted — it comes from the
      // fetched SKILL.md frontmatter or source dir name. `name: ../x` could
      // otherwise write (and the preceding rmSync could delete) outside STORE_DIR.
      // Prefer the frontmatter name when safe; else the dir name; else skip.
      const name = sanitizeSkillName(raw) || sanitizeSkillName(entry.name)
      if (!name) { skipped.push(entry.name); continue }
      const dest = path.join(STORE_DIR, name)
      const reinstalled = fs.existsSync(dest)
      fs.rmSync(dest, { recursive: true, force: true })
      // cpSync (not renameSync): rename fails across volumes (EXDEV: C: temp → S: store).
      fs.cpSync(srcSkillDir, dest, { recursive: true })
      // remember the source so `skill update` can re-fetch it later
      fs.writeFileSync(path.join(dest, '.source'), resolved + '\n')
      moved.push({ name, reinstalled })
    }
    for (const s of skipped) console.log(c.yellow('  ⚠ skipped ') + c.bold(s) + c.gray(' (not a safe skill name)'))

    if (moved.length === 0) {
      // throw (not process.exit) so the finally cleans up the temp dir
      throw new Error('No skills moved to store.')
    }
    const fresh = moved.filter(m => !m.reinstalled).length
    const re = moved.length - fresh
    console.log(c.green(`✓ ${fresh} installed` + (re ? c.gray(` · ${re} reinstalled`) : '') + ' to store:'))
    for (const m of moved) {
      const mark = m.reinstalled ? c.yellow('↻') : c.green('•')
      const tail = m.reinstalled ? c.gray('  (reinstalled)') : c.gray('  → ' + path.join(STORE_DIR, m.name))
      console.log('  ' + mark + ' ' + c.bold(m.name) + tail)
    }
    console.log()
    console.log(c.gray('Skills are passive until enabled. Activate with: ') + c.cyan('skill enable <name>') + c.gray(' or ') + c.cyan('-g'))
  } finally {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true })
  }
}
