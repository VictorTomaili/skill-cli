import fs from 'node:fs'
import path from 'node:path'
import yaml from 'yaml'
import { CLI_ROOT, GLOBAL_CONFIG, PROJECT_CONFIG, STORE_DIR } from './paths.js'

const DEFAULT_GLOBAL = {
  version: 1,
  store: STORE_DIR,
  defaults: [],
}

export function readGlobalConfig() {
  let raw
  try { raw = fs.readFileSync(GLOBAL_CONFIG, 'utf8') } catch { return { ...DEFAULT_GLOBAL } }
  let parsed
  try { parsed = yaml.parse(raw) } catch (e) {
    process.stderr.write('skill-cli config: parse error (' + (e.message || e) + ') — using defaults\n')
    return { ...DEFAULT_GLOBAL }
  }
  const merged = { ...DEFAULT_GLOBAL, ...(parsed || {}) }
  // backward-compat: legacy configs split the active-by-default set
  // (`enabled_global`) from the auto-load set (`defaults_global`). The unified
  // model collapses them into one `defaults` list (a default skill is now BOTH
  // active-by-default AND auto-loaded). On read, adopt the union of both legacy
  // lists when no new-format `defaults` is present; `defaults` always wins.
  if (!Array.isArray(merged.defaults) || merged.defaults.length === 0) {
    const legacy = [
      ...(Array.isArray(parsed?.enabled_global) ? parsed.enabled_global : []),
      ...(Array.isArray(parsed?.defaults_global) ? parsed.defaults_global : []),
    ]
    if (legacy.length) merged.defaults = [...new Set(legacy.map(String))]
  }
  return merged
}

export function writeGlobalConfig(cfg) {
  fs.mkdirSync(CLI_ROOT, { recursive: true })
  // B2: write only the known schema, not arbitrary pass-through keys. readGlobalConfig
  // merges parsed-over-defaults, which would otherwise round-trip dead keys (e.g.
  // the removed `default_agents`) back into the file forever.
  const out = {
    version: cfg.version ?? 1,
    store: cfg.store ?? STORE_DIR,
    defaults: cfg.defaults || [],
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
  return { inherit: true, deny: [], allow: [], ...(parsed || []) }
}

export function writeProjectConfig(cwd, cfg) {
  // B2: normalize to the known schema on write (drops stale/junk keys).
  const out = {
    inherit: cfg.inherit !== false,
    deny: cfg.deny || [],
    allow: cfg.allow || [],
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
    (projCfg && projCfg.inherit === false ? [] : (globalCfg.defaults || []))
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
// names. In the unified model the default list IS the globally-active-by-default
// set (one `defaults` key in config.yaml): a default skill is active in every
// project AND auto-loaded on start. So this just returns that list filtered to
// installed skills. Defaults are GLOBAL (never per-folder) and ignore a
// project's deny rules (deny only governs active state, not auto-load).
export function computeDefaults(installed, globalCfg) {
  const canonByLower = new Map(installed.map(s => [String(s.name).toLowerCase(), s.name]))
  return [...new Set((globalCfg.defaults || []).map(s => String(s).toLowerCase()))]
    .filter(n => canonByLower.has(n))
    .map(n => canonByLower.get(n))
    .sort()
}
