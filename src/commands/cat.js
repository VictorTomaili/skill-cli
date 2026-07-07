import c from 'picocolors'
import { readSkill } from '../lib/store.js'

// Dumps the skill body so it can be loaded into context.
export function cmdCat(args) {
  const name = args[0]
  if (!name) { console.error(c.red('Usage: skill cat <name>')); process.exit(1) }
  const s = readSkill(name)
  if (!s) { console.error(c.red('Skill not found: ' + name)); process.exit(1) }
  console.log(c.gray('<!-- skill: ' + s.name + ' -->'))
  console.log(s.body.trim())
}
