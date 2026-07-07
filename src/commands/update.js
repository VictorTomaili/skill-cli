import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import c from 'picocolors'
import { STORE_DIR } from '../lib/paths.js'
import { parseSkillMd } from '../lib/frontmatter.js'
import { listStore } from '../lib/store.js'
import { fetchSkillsToTemp } from '../lib/npx.js'
import { pad } from '../lib/format.js'

// Re-fetch each skill from its recorded source and update the store if changed.
//   skill update              update all skills in the store
//   skill update <name>...    update specific skills
//   skill update --all        same as no args (explicit)
export function cmdUpdate(args) {
  const installed = listStore()
  const byLower = new Map(installed.map(s => [s.name.toLowerCase(), s.name]))
  const explicit = args.filter(a => !a.startsWith('-'))

  let targets = []
  let unknown = 0
  if (explicit.length) {
    // B1: case-fold to the canonical installed name (every other command does).
    // A side benefit: an unknown name like `../x` can't reach path.join(STORE_DIR,
    // name), closing the latent traversal surface in `skill update <name>`.
    for (const a of explicit) {
      const canon = byLower.get(a.toLowerCase())
      if (canon) targets.push(canon)
      else { console.log(c.red('  ✗ ' + pad(a)) + c.red('not installed')); unknown++ }
    }
  } else {
    targets = installed.map(s => s.name)
  }

  if (targets.length === 0 && unknown === 0) {
    console.log(c.yellow('Store empty. Nothing to update.'))
    return
  }

  console.log(c.bold(`Updating ${targets.length} skill(s)…`) + c.gray('  (re-fetch from source)'))
  console.log()

  const counts = { updated: 0, current: 0, failed: 0, nosource: 0 }
  counts.failed += unknown
  for (const name of targets) counts[updateOne(name)]++

  console.log()
  console.log(c.gray(`  ${counts.updated} updated · ${counts.current} up to date · ${counts.failed} failed · ${counts.nosource} no source`))
  // signal failure to callers/scripts: a non-zero exit if any fetch failed, so
  // `skill update && deploy` won't silently proceed on a broken source.
  if (counts.failed > 0) process.exit(1)
}

function updateOne(name) {
  const skillPath = path.join(STORE_DIR, name)
  if (!fs.existsSync(skillPath)) {
    console.log(c.red('  ✗ ' + pad(name)) + c.red('not installed'))
    return 'failed'
  }
  const sourceFile = path.join(skillPath, '.source')
  if (!fs.existsSync(sourceFile)) {
    console.log(c.gray('  · ' + pad(name)) + c.gray('source unknown — reinstall: skill install <source>'))
    return 'nosource'
  }
  const source = fs.readFileSync(sourceFile, 'utf8').trim()

  let tmp, fetchedDir
  try {
    ({ tmp, fetchedDir } = fetchSkillsToTemp(source))
  } catch (e) {
    console.log(c.red('  ✗ ' + pad(name)) + c.red((e.message || '').split('\n')[0]))
    return 'failed'
  }

  try {
    const newDir = resolveFetched(fetchedDir, name)
    if (!newDir) throw new Error('skill not found in fetched source')
    const newSkillDir = path.join(fetchedDir, newDir.name)

    const oldVer = getVer(skillPath)
    const newVer = getVer(newSkillDir)

    if (hashDir(skillPath) === hashDir(newSkillDir)) {
      console.log(c.gray('  ✓ ' + pad(name)) + c.gray('up to date'))
      return 'current'
    }
    // replace content, preserve .source
    fs.rmSync(skillPath, { recursive: true, force: true })
    fs.cpSync(newSkillDir, skillPath, { recursive: true })
    fs.writeFileSync(path.join(skillPath, '.source'), source + '\n')
    const verInfo = oldVer !== newVer ? c.green(`${oldVer} → ${newVer}`) : c.gray('content changed')
    console.log(c.green('  ↑ ') + c.bold(pad(name)) + verInfo)
    return 'updated'
  } catch (e) {
    console.log(c.red('  ✗ ' + pad(name)) + c.red((e.message || '').split('\n')[0]))
    return 'failed'
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

// find the fetched skill dir by name (dir name or SKILL.md name field), else single
function resolveFetched(fetchedDir, name) {
  const entries = fs.readdirSync(fetchedDir, { withFileTypes: true }).filter(e => e.isDirectory())
  const byDir = entries.find(e => e.name === name)
  if (byDir) return byDir
  for (const e of entries) {
    const md = path.join(fetchedDir, e.name, 'SKILL.md')
    if (fs.existsSync(md)) {
      try {
        const { data } = parseSkillMd(fs.readFileSync(md, 'utf8'))
        if (data.name === name) return e
      } catch {}
    }
  }
  // Not found by dir name or SKILL.md name field. Do NOT guess — the previous
  // single-entry fallback could silently replace a skill with a different one if
  // the source had changed which skill it ships. Fail loud so the user notices.
  return null
}

// sha256 over all files in dir (excluding our own .source), sorted for determinism
function hashDir(dir) {
  const h = crypto.createHash('sha256')
  if (!fs.existsSync(dir)) return '0'
  const files = []
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.source') continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else files.push(p)
    }
  }
  walk(dir)
  files.sort()
  for (const f of files) {
    h.update(f.slice(dir.length))
    try { h.update(fs.readFileSync(f)) } catch {}
  }
  return h.digest('hex')
}

function getVer(dir) {
  const md = path.join(dir, 'SKILL.md')
  if (!fs.existsSync(md)) return '?'
  try { const { data } = parseSkillMd(fs.readFileSync(md, 'utf8')); return data.version || '?' } catch { return '?' }
}
