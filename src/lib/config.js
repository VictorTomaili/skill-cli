import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml'
import { CLI_ROOT, GLOBAL_CONFIG, PROJECT_CONFIG, STORE_DIR } from './paths.js'

const DEFAULT_GLOBAL = {
  version: 1,
  store: STORE_DIR,
  enabled_global: [],
  default_agents: ['claude', 'codex'],
}

export function readGlobalConfig() {
  try {
    const raw = fs.readFileSync(GLOBAL_CONFIG, 'utf8')
    return { ...DEFAULT_GLOBAL, ...(yaml.parse(raw) || {}) }
  } catch {
    return { ...DEFAULT_GLOBAL }
  }
}

export function writeGlobalConfig(cfg) {
  fs.mkdirSync(CLI_ROOT, { recursive: true })
  fs.writeFileSync(GLOBAL_CONFIG, yaml.stringify(cfg), 'utf8')
}

export function projectConfigPath(cwd = process.cwd()) {
  return path.join(cwd, PROJECT_CONFIG)
}

// Returns null when no project config exists. A malformed YAML is reported on
// stderr (rather than silently falling back to global behavior).
export function readProjectConfig(cwd = process.cwd()) {
  let raw
  try { raw = fs.readFileSync(projectConfigPath(cwd), 'utf8') } catch { return null }
  let parsed
  try { parsed = yaml.parse(raw) } catch (e) {
    process.stderr.write('skill.config: parse error (' + (e.message || e) + ') — using global behavior\n')
    return null
  }
  return { inherit: true, deny: [], allow: [], ...(parsed || {}) }
}

export function writeProjectConfig(cwd, cfg) {
  fs.writeFileSync(projectConfigPath(cwd), yaml.stringify(cfg), 'utf8')
}

// Simple glob: * → any chars, ? → single char. Pattern length is capped to guard
// against ReDoS on user-supplied deny patterns.
function globMatch(pattern, name) {
  if (pattern === '*') return true
  if (pattern.length > 200) return false
  const re = new RegExp(
    '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    'i'
  )
  return re.test(name)
}

// Effective skills, returned as CANONICAL names (from the installed store). allow
// always wins over deny, so `deny: ["*"]` + `allow: [X]` = "only X". Matching is
// case-insensitive throughout — the user may type "React-BP" while the skill is "react-bp".
export function computeEffective(installed, globalCfg, projCfg) {
  const canonByLower = new Map(installed.map(s => [String(s.name).toLowerCase(), s.name]))
  const enabled = new Set(
    (projCfg && projCfg.inherit === false ? [] : (globalCfg.enabled_global || []))
      .map(s => String(s).toLowerCase())
  )
  if (projCfg) {
    const allowLower = new Set((projCfg.allow || []).map(a => String(a).toLowerCase()))
    for (const d of (projCfg.deny || [])) {
      for (const name of [...enabled]) {
        if (allowLower.has(name)) continue
        if (d.includes('*') ? globMatch(d, name) : String(d).toLowerCase() === name) {
          enabled.delete(name)
        }
      }
    }
    for (const a of (projCfg.allow || [])) enabled.add(String(a).toLowerCase())
  }
  return [...enabled]
    .filter(n => canonByLower.has(n))
    .map(n => canonByLower.get(n))
    .sort()
}
