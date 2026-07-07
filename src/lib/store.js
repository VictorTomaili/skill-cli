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

export function readSkill(nameOrDir) {
  // try as dir first, then resolve by SKILL.md name field
  let md = skillMdPath(nameOrDir)
  if (!fs.existsSync(md)) {
    const hit = listStore().find(s => s.name.toLowerCase() === String(nameOrDir).toLowerCase())
    if (!hit) return null
    md = hit.path
  }
  const { data, body } = parseSkillMd(fs.readFileSync(md, 'utf8'))
  return { name: data.name || nameOrDir, data, body, path: md }
}
