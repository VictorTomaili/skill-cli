import yaml from 'yaml'

// SKILL.md = YAML frontmatter + markdown body. Faithful to the npx skills standard.
export function parseSkillMd(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: content }
  let data = {}
  try { data = yaml.parse(m[1]) || {} } catch { /* malformed frontmatter → empty */ }
  return { data, body: m[2] || '' }
}

// "/Research", "Research", "research" → "research"
export function normalizeTrigger(t) {
  return String(t).replace(/^\/+/, '').trim().toLowerCase()
}

// frontmatter.triggers → normalized array
export function getTriggers(data) {
  const t = data.triggers
  if (Array.isArray(t)) return t.map(normalizeTrigger).filter(Boolean)
  if (typeof t === 'string') return t.split(',').map(normalizeTrigger).filter(Boolean)
  return []
}
