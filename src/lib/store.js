import fs from 'node:fs'
import path from 'node:path'
import { STORE_DIR } from './paths.js'
import { parseSkillMd, getTriggers } from './frontmatter.js'

export function skillDir(name) { return path.join(STORE_DIR, name) }
export function skillMdPath(name) { return path.join(skillDir(name), 'SKILL.md') }

// Scan the store for all skills (name, description, version, triggers, path)
export function listStore() {
  if (!fs.existsSync(STORE_DIR)) return []
  const out = []
  for (const entry of fs.readdirSync(STORE_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const md = skillMdPath(entry.name)
    if (!fs.existsSync(md)) continue
    try {
      const { data } = parseSkillMd(fs.readFileSync(md, 'utf8'))
      out.push({
        name: data.name || entry.name,
        dir: entry.name,
        description: data.description || '',
        version: data.version || '-',
        triggers: getTriggers(data),
        path: md,
      })
    } catch { /* broken skill → skip */ }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

// A skill name is a plain identifier (alnum/._-, starting alnum). Rejecting path
// separators and ".." closes a path-traversal surface: `skill cat ../../x` can't
// escape STORE_DIR via the dir-name path.
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export function readSkill(nameOrDir) {
  const n = String(nameOrDir)
  let md = SAFE_NAME.test(n) && !n.includes('..') && fs.existsSync(skillMdPath(n)) ? skillMdPath(n) : null
  if (!md) {
    const hit = listStore().find(s => s.name.toLowerCase() === n.toLowerCase())
    if (!hit) return null
    md = hit.path
  }
  const { data, body } = parseSkillMd(fs.readFileSync(md, 'utf8'))
  return { name: data.name || n, data, body, path: md }
}
