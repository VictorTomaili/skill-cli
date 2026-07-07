import c from 'picocolors'
import { listStore, readSkill } from '../lib/store.js'
import { readGlobalConfig, readProjectConfig, computeEffective } from '../lib/config.js'
import { normalizeTrigger } from '../lib/frontmatter.js'
import { trunc } from '../lib/format.js'

// Dump a single skill's body into context. Shared by the trigger-keyword and
// exact-name code paths so both render identically.
function loadSingle(skill, via) {
  const s = readSkill(skill.name)
  if (!s) { console.error(c.red('Skill not readable: ' + skill.name)); process.exit(1) }
  console.log(c.green('▼ skill: ') + c.bold(s.name) + c.gray('  (' + via + ')'))
  console.log(c.gray('━'.repeat(56)))
  console.log(s.body.trim())
}

// `skill trigger <keyword|name>`:
//   1. keyword matches a trigger across ACTIVE skills
//        single  → dump content (drops into context)
//        multi   → candidate list (name + description); pick with `skill cat <name>`
//   2. no trigger match → exact NAME match among active skills. Lets you load
//      description-triggered skills that have no `triggers:` field (e.g. skills
//      imported from the `skills` / vercel-labs ecosystem) by name.
//   3. name matches only a PASSIVE skill → hint how to activate (or read via cat).
//   4. nothing → informational.
export function cmdTrigger(args) {
  const keyword = normalizeTrigger(args[0] || '')
  if (!keyword) {
    console.error(c.red('Usage: skill trigger <keyword|name>   (e.g. /research, web-design-guidelines)'))
    process.exit(1)
  }

  const installed = listStore()
  const effective = computeEffective(installed, readGlobalConfig(), readProjectConfig())

  // 1) trigger-keyword match across ACTIVE skills — a passive skill cannot trigger.
  const candidates = installed.filter(s => effective.includes(s.name) && s.triggers.includes(keyword))

  if (candidates.length >= 2) {
    console.log(c.yellow('/' + keyword) + ' matched ' + c.bold(candidates.length + ' skills') + ' — pick one:')
    console.log()
    for (const s of candidates) {
      console.log('  ' + c.cyan(s.name.padEnd(20)) + c.gray('  ' + trunc(s.description, 54)))
    }
    console.log()
    console.log(c.gray('Pick: ') + 'skill cat <name>')
    return
  }
  if (candidates.length === 1) {
    loadSingle(candidates[0], 'triggered: /' + keyword)
    return
  }

  // 2) no trigger match → exact-name fallback among ACTIVE skills.
  const byName = installed.filter(s => effective.includes(s.name) && s.name.toLowerCase() === keyword)
  if (byName.length === 1) {
    loadSingle(byName[0], 'name: ' + byName[0].name)
    return
  }

  // 3) name matches only a PASSIVE skill → it's installed but not active.
  const passive = installed.find(s => !effective.includes(s.name) && s.name.toLowerCase() === keyword)
  if (passive) {
    console.log(c.yellow('Skill ') + c.bold(passive.name) + c.yellow(' is installed but not active.'))
    console.log(c.gray('  Enable: ') + c.cyan('skill enable [-g] ' + passive.name) + c.gray('  · read now: ') + c.cyan('skill cat ' + passive.name))
    return
  }

  // 4) nothing matched.
  console.log(c.yellow('No active skill has the ') + c.cyan('/' + keyword) + c.yellow(' trigger.'))
  console.log(c.gray('  Run skill list to see active skills and their triggers.'))
}
