import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml'
import { CLI_ROOT, GLOBAL_CONFIG, PROJECT_CONFIG, STORE_DIR } from './paths.js'

const DEFAULT_GLOBAL = {
  version: 1,
  store: STORE_DIR,
  enabled_global: [],
  defaults_global: [],
}

export function readGlobalConfig() {
  let raw
  try { raw = fs.readFileSync(GLOBAL_CONFIG, 'utf8') } catch { return { ...DEFAULT_GLOBAL } }
  let parsed
  try { parsed = yaml.parse(raw) } catch (e) {
    process.stderr.write('skill-cli config: parse error (' + (e.message || e) + ') — using defaults\n')
    return { ...DEFAULT_GLOBAL }
  }
  return { ...DEFAULT_GLOBAL, ...(parsed || {}) }
}

export function writeGlobalConfig(cfg) {
  fs.mkdirSync(CLI_ROOT, { recursive: true })
  // B2: write only the known schema, not arbitrary pass-through keys. readGlobalConfig
  // merges parsed-over-defaults, which would otherwise round-trip dead keys (e.g.
  // the removed `default_agents`) back into the file forever.
  const out = {
    version: cfg.version ?? 1,
    store: cfg.store ?? STORE_DIR,
    enabled_global: cfg.enabled_global || [],
    defaults_global: cfg.defaults_global || [],
  }
  fs.writeFileSync(GLOBAL_CONFIG, yaml.stringify(out), 'utf8')
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
  return { inherit: true, deny: [], allow: [], defaults: [], ...(parsed || {}) }
}

export function writeProjectConfig(cwd, cfg) {
  // B2: normalize to the known schema on write (drops stale/junk keys).
  const out = {
    inherit: cfg.inherit !== false,
    deny: cfg.deny || [],
    allow: cfg.allow || [],
    defaults: cfg.defaults || [],
  }
  fs.writeFileSync(projectConfigPath(cwd), yaml.stringify(out), 'utf8')
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

// Effective DEFAULT skills (auto-loaded on agent session start), as CANONICAL
// names. Independent of enable/disable: a skill may be active-but-not-default or
// default-but-not-active. Inherits global defaults unless the project sets
// inherit:false. Case-insensitive throughout.
export function computeDefaults(installed, globalCfg, projCfg) {
  const canonByLower = new Map(installed.map(s => [String(s.name).toLowerCase(), s.name]))
  const set = new Set()
  if (!projCfg || projCfg.inherit !== false) {
    for (const d of (globalCfg.defaults_global || [])) set.add(String(d).toLowerCase())
  }
  if (projCfg) for (const d of (projCfg.defaults || [])) set.add(String(d).toLowerCase())
  return [...set].filter(n => canonByLower.has(n)).map(n => canonByLower.get(n)).sort()
}
