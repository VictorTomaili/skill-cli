import c from 'picocolors'
import { listStore } from '../lib/store.js'
import { readGlobalConfig, writeGlobalConfig } from '../lib/config.js'

// `skill defaults` — list the skills marked as defaults. In the unified model a
// default skill is BOTH active-by-default in every project AND auto-loaded on
// agent session start (one global `defaults` list). This is the agent-facing
// command the AGENTS.md block tells the agent to run, then `skill cat <name>`
// for each. Defaults are a GLOBAL concept (never per-folder).
export function cmdDefaults() {
  const installed = listStore()
  const globalCfg = readGlobalConfig()
  const defs = new Set((globalCfg.defaults || []).map(d => String(d).toLowerCase()))

  console.log(c.bold('skill defaults') + c.gray(' — skill catalog (descriptions only; the agent decides: functional → `skill cat`, context-altering → propose)'))
  console.log()

  if (installed.length === 0) {
    console.log(c.gray('  No skills installed. Install with: ') + c.cyan('skill install <source>'))
    return
  }

  // CATALOG, not a loader: print every installed skill's name + FULL description
  // (collapsed to one line) + triggers. Never dump the skill body here — the
  // agent reads descriptions, then itself decides per skill: load (skill cat) if
  // it's functional for the task, or PROPOSE if it's context-altering (changes
  // HOW the agent responds). Detection is the agent's judgment from the
  // description, so it works for any skill — including ones loaded later — with
  // no hardcoded list or flag.
  for (const s of installed) {
    const star = defs.has(s.name.toLowerCase()) ? c.yellow('★') + ' ' : '  '
    const trg = s.triggers.length ? '  ' + c.gray('/' + s.triggers.join(', /')) : ''
    console.log(`  ${star}${c.bold(s.name)}${trg}`)
    if (s.description) console.log(c.gray('      ' + String(s.description).replace(/[\r\n]+/g, ' ').trim()))
  }
  console.log()
  console.log(c.yellow('★') + c.gray(' = default (active by default). Load a skill: ') + c.cyan('skill cat <name>'))
}

// `skill default <name>` — mark a skill as a default (active by default in every
// project + auto-loaded on session start). Always GLOBAL. Requires the skill to
// be installed (a typo would silently "succeed" but never resolve). `-g`/`--global`
// is accepted for compatibility but is a no-op — defaults are inherently global.
export function cmdDefault(args) {
  const name = args.find(a => !a.startsWith('-'))
  if (!name) {
    console.error(c.red('Usage: skill default <name>'))
    console.error(c.gray('  Marks a skill as a default: active by default in every project + auto-load on session start.'))
    process.exit(1)
  }
  if (!listStore().some(s => s.name.toLowerCase() === name.toLowerCase())) {
    console.error(c.red('Not installed: ' + name))
    console.error(c.gray('  Install first: skill install <source>'))
    process.exit(1)
  }
  const cfg = readGlobalConfig()
  if (!(cfg.defaults || []).some(d => d.toLowerCase() === name.toLowerCase())) {
    cfg.defaults.push(name.toLowerCase())
    cfg.defaults.sort()
  }
  writeGlobalConfig(cfg)
  console.log(c.green('✓') + ' default (global): ' + c.bold(name) + c.gray('  (active + auto-load in every project)'))
}

// `skill undefault <name>` — remove the default flag (always global).
export function cmdUndefault(args) {
  const name = args.find(a => !a.startsWith('-'))
  if (!name) {
    console.error(c.red('Usage: skill undefault <name>'))
    process.exit(1)
  }
  const cfg = readGlobalConfig()
  const had = (cfg.defaults || []).some(d => d.toLowerCase() === name.toLowerCase())
  cfg.defaults = (cfg.defaults || []).filter(d => d.toLowerCase() !== name.toLowerCase())
  writeGlobalConfig(cfg)
  console.log(had
    ? (c.green('✓') + ' removed default: ' + c.bold(name))
    : (c.gray('·') + ' not a default: ' + c.bold(name) + c.gray(' (nothing to do)')))
}
