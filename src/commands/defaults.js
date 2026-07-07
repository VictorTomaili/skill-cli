import c from 'picocolors'
import { listStore } from '../lib/store.js'
import { readGlobalConfig, writeGlobalConfig, readProjectConfig, writeProjectConfig, computeDefaults } from '../lib/config.js'
import { trunc } from '../lib/format.js'

// `skill defaults` — list the skills marked as defaults (auto-loaded on agent
// session start). This is the agent-facing command the AGENTS.md block tells the
// agent to run, then `skill cat <name>` for each. cwd-aware (global + project).
export function cmdDefaults() {
  const installed = listStore()
  const globalCfg = readGlobalConfig()
  const projCfg = readProjectConfig()
  const eff = computeDefaults(installed, globalCfg, projCfg)

  const scope = projCfg ? c.magenta(process.cwd()) : c.gray('(global)')
  console.log(c.bold('skill defaults') + c.gray(' — auto-load on session start · project: ') + scope)
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

// `skill default <name> [-g]` — mark a skill as a default (auto-load). Requires
// the skill to be installed (a typo would silently "succeed" but never resolve).
export function cmdDefault(args) {
  const global = args.includes('-g') || args.includes('--global')
  const name = args.find(a => !a.startsWith('-'))
  if (!name) {
    console.error(c.red('Usage: skill default <name> [-g]'))
    console.error(c.gray('  Marks a skill as a default (auto-loaded on agent session start).'))
    process.exit(1)
  }
  if (!listStore().some(s => s.name.toLowerCase() === name.toLowerCase())) {
    console.error(c.red('Not installed: ' + name))
    console.error(c.gray('  Install first: skill install <source>'))
    process.exit(1)
  }
  if (global) {
    const cfg = readGlobalConfig()
    if (!(cfg.defaults_global || []).some(d => d.toLowerCase() === name.toLowerCase())) {
      cfg.defaults_global.push(name.toLowerCase())
      cfg.defaults_global.sort()
    }
    writeGlobalConfig(cfg)
    console.log(c.green('✓') + ' default globally: ' + c.bold(name) + c.gray('  (auto-load in every project)'))
  } else {
    const cwd = process.cwd()
    const cfg = readProjectConfig(cwd) || { inherit: true, deny: [], allow: [], defaults: [] }
    if (!(cfg.defaults || []).some(d => d.toLowerCase() === name.toLowerCase())) cfg.defaults.push(name.toLowerCase())
    writeProjectConfig(cwd, cfg)
    console.log(c.green('✓') + ' default in project: ' + c.bold(name) + c.gray('  (' + cwd + ')'))
  }
}

// `skill undefault <name> [-g]` — remove the default flag.
export function cmdUndefault(args) {
  const global = args.includes('-g') || args.includes('--global')
  const name = args.find(a => !a.startsWith('-'))
  if (!name) {
    console.error(c.red('Usage: skill undefault <name> [-g]'))
    process.exit(1)
  }
  if (global) {
    const cfg = readGlobalConfig()
    const had = (cfg.defaults_global || []).some(d => d.toLowerCase() === name.toLowerCase())
    cfg.defaults_global = (cfg.defaults_global || []).filter(d => d.toLowerCase() !== name.toLowerCase())
    writeGlobalConfig(cfg)
    console.log(had
      ? (c.green('✓') + ' removed global default: ' + c.bold(name))
      : (c.gray('·') + ' not a global default: ' + c.bold(name) + c.gray(' (nothing to do)')))
  } else {
    const cwd = process.cwd()
    const cfg = readProjectConfig(cwd) || { inherit: true, deny: [], allow: [], defaults: [] }
    const had = (cfg.defaults || []).some(d => d.toLowerCase() === name.toLowerCase())
    cfg.defaults = (cfg.defaults || []).filter(d => d.toLowerCase() !== name.toLowerCase())
    writeProjectConfig(cwd, cfg)
    console.log(had
      ? (c.green('✓') + ' removed project default: ' + c.bold(name))
      : (c.gray('·') + ' not a project default: ' + c.bold(name) + c.gray(' (nothing to do)')))
  }
}
