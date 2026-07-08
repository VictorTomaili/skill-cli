import c from 'picocolors'
import { listStore } from '../lib/store.js'
import { readGlobalConfig, writeGlobalConfig, readProjectConfig, computeEffective } from '../lib/config.js'

// `skill active` (aliases: `status`, legacy `defaults`) — the description-only
// catalog of ACTIVE skills in the current project (defaults + project allow,
// minus deny). The agent runs this at session start: it lists each active skill's
// name + FULL description (never the body), then the agent itself decides per
// skill — functional → `skill cat`, context-altering → propose. Detection of
// context-altering is the agent's judgment from the description (no flag, no fixed
// list), so it works for any skill, including ones installed later.
export function cmdActive() {
  const installed = listStore()
  const globalCfg = readGlobalConfig()
  const projCfg = readProjectConfig()
  const eff = computeEffective(installed, globalCfg, projCfg)
  const defs = new Set((globalCfg.defaults || []).map(d => String(d).toLowerCase()))

  console.log(c.bold('skill active') + c.gray(' — active skills (descriptions only). LOAD correctness/quality ones; PROPOSE every cost/style/speed one (a trade-off is the USER') + c.gray("'s call — never skip it)."))
  console.log()

  if (eff.length === 0) {
    console.log(c.gray('  No active skills in this project.'))
    return
  }

  // CATALOG of ACTIVE skills only (not all installed): defaults + project allow,
  // minus deny. Print each one's name + FULL description (one line) + triggers —
  // never the body. The agent reads descriptions and itself decides per skill:
  // load (skill cat) if functional for the task, or PROPOSE if context-altering
  // (changes HOW the agent responds). Detection is the agent's judgment from the
  // description, so it works for any skill — including ones installed later —
  // with no hardcoded list or flag.
  for (const name of eff) {
    const s = installed.find(x => x.name === name)
    if (!s) continue
    const star = defs.has(s.name.toLowerCase()) ? c.yellow('★') + ' ' : '  '
    const trg = s.triggers.length ? '  ' + c.gray('/' + s.triggers.join(', /')) : ''
    console.log(`  ${star}${c.bold(s.name)}${trg}`)
    if (s.description) console.log(c.gray('      ' + String(s.description).replace(/[\r\n]+/g, ' ').trim()))
  }
  console.log()
  console.log(c.bold('→ For EACH skill above, decide in your reply:'))
  console.log(c.gray('    LOAD    moves CORRECTNESS/QUALITY → run ') + c.cyan('skill cat <name>') + c.gray(' now.'))
  console.log(c.gray('    PROPOSE moves COST, STYLE, or SPEED  → you MUST ASK "enable <name>?". A trade-off is the'))
  console.log(c.gray('            USER') + c.gray("'s decision — these move an axis on EVERY reply, so NEVER skip one and"))
  console.log(c.gray('            NEVER say "not relevant to this task" (that = you deciding for the user).'))
  console.log(c.gray('    SKIP    moves NONE of the above.'))
  console.log(c.yellow('  ⚠ If you wrote "cost/style but not relevant here" → that is the bug. Ask instead.'))
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
