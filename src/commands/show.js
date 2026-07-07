import c from 'picocolors'
import { readSkill } from '../lib/store.js'
import { getTriggers } from '../lib/frontmatter.js'

export function cmdShow(args) {
  const name = args[0]
  if (!name) { console.error(c.red('Usage: skill show <name>')); process.exit(1) }
  const s = readSkill(name)
  if (!s) { console.error(c.red('Skill not found: ' + name)); process.exit(1) }

  console.log(c.bold(s.name) + c.gray('  v' + (s.data.version || '?')))
  if (s.data.description) console.log(c.gray(s.data.description))
  console.log()
  console.log(c.gray('path:     ') + s.path)
  const trg = getTriggers(s.data).map(t => '/' + t).join(', ') || '—'
  console.log(c.gray('triggers: ') + trg)
  console.log(c.gray('content:  ') + c.cyan('skill cat ' + s.name))
}
