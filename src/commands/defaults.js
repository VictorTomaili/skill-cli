import c from 'picocolors'
import { listStore } from '../lib/store.js'
import { readGlobalConfig, writeGlobalConfig, computeDefaults } from '../lib/config.js'
import { trunc } from '../lib/format.js'

// `skill defaults` — list the skills marked as defaults. In the unified model a
// default skill is BOTH active-by-default in every project AND auto-loaded on
// agent session start (one global `defaults` list). This is the agent-facing
// command the AGENTS.md block tells the agent to run, then `skill cat <name>`
// for each. Defaults are a GLOBAL concept (never per-folder).
export function cmdDefaults() {
  const installed = listStore()
  const globalCfg = readGlobalConfig()
  const eff = computeDefaults(installed, globalCfg)

  console.log(c.bold('skill defaults') + c.gray(' — active by default + auto-load on session start (global)'))
  console.log()

  if (eff.length === 0) {
    console.log(c.gray('  No default skills yet. Mark with: ') + c.cyan('skill default <name>'))
    return
  }

  for (const name of eff) {
    const s = installed.find(x => x.name === name)
    const trg = s && s.triggers.length ? '  ' + c.gray('/' + s.triggers.join(', /')) : ''
    console.log(`  ${c.yellow('★')} ${c.bold(name.padEnd(22))}${trg}`)
    if (s && s.description) console.log(c.gray('      ' + trunc(s.description, 66)))
  }
  console.log()
  console.log(c.gray('Load each into context: ') + c.cyan('skill cat <name>'))
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
