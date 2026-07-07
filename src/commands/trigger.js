import c from 'picocolors'
import { listStore, readSkill } from '../lib/store.js'
import { readGlobalConfig, readProjectConfig, computeEffective } from '../lib/config.js'
import { normalizeTrigger } from '../lib/frontmatter.js'
import { trunc } from '../lib/format.js'

// /X trigger: keyword match across ACTIVE skills.
//   single  → dump skill content (drops into context)
//   multi   → candidate list (name + description); agent picks with `skill cat <name>`
//   none    → informational
export function cmdTrigger(args) {
  const keyword = normalizeTrigger(args[0] || '')
  if (!keyword) {
    console.error(c.red('Usage: skill trigger <keyword>   (e.g. /research)'))
    process.exit(1)
  }

  const installed = listStore()
  const effective = computeEffective(installed, readGlobalConfig(), readProjectConfig())
  // Search ONLY active skills — a passive skill cannot trigger.
  const candidates = installed.filter(s => effective.includes(s.name) && s.triggers.includes(keyword))

  if (candidates.length === 0) {
    console.log(c.yellow('No active skill has the ') + c.cyan('/' + keyword) + c.yellow(' trigger.'))
    console.log(c.gray('  Run skill list to see active skills and their triggers.'))
    return
  }

  if (candidates.length === 1) {
    const s = readSkill(candidates[0].name)
    console.log(c.green('▼ skill: ') + c.bold(s.name) + c.gray('  (triggered: /' + keyword + ')'))
    console.log(c.gray('━'.repeat(56)))
    console.log(s.body.trim())
    return
  }

  console.log(c.yellow('/' + keyword) + ' matched ' + c.bold(candidates.length + ' skills') + ' — pick one:')
  console.log()
  for (const s of candidates) {
    console.log('  ' + c.cyan(s.name.padEnd(20)) + c.gray('  ' + trunc(s.description, 54)))
  }
  console.log()
  console.log(c.gray('Pick: ') + 'skill cat <name>')
}

