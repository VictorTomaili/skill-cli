import c from 'picocolors'
import { listStore } from '../lib/store.js'
import { readGlobalConfig, readProjectConfig, computeEffective, computeDefaults } from '../lib/config.js'
import { trunc } from '../lib/format.js'

export function cmdList(_args = []) {
  const installed = listStore()
  const globalCfg = readGlobalConfig()
  const projCfg = readProjectConfig()
  const effective = computeEffective(installed, globalCfg, projCfg)
  const defaults = computeDefaults(installed, globalCfg)

  const scope = projCfg ? c.magenta(process.cwd()) : c.gray('(global)')
  console.log(c.bold('skill list') + c.gray(' — project: ') + scope)
  console.log()

  if (installed.length === 0) {
    console.log(c.yellow('  Store empty.') + c.gray('  First: skill install <source>'))
    return
  }

  for (const s of installed) {
    const active = effective.includes(s.name)
    const mark = active ? c.green('●') : c.gray('○')
    const star = defaults.includes(s.name) ? c.yellow('★') : c.gray('·')
    const sc = labelScope(s.name, globalCfg, projCfg)
    const trg = s.triggers.length ? '  ' + c.gray('/' + s.triggers.join(', /')) : ''
    console.log(`  ${mark} ${star} ${c.bold(s.name.padEnd(22))} ${c.gray(String(s.version).padEnd(8))} ${sc}${trg}`)
    if (s.description) console.log(c.gray('      ' + trunc(s.description, 68)))
  }
  console.log()
  console.log(c.green('● active   ') + c.gray('○ passive   ') + c.yellow('★ default (auto-load on session start)'))
  console.log(c.cyan('Details: ') + 'skill show <name>   ' + c.cyan('Load: ') + 'skill cat <name>')
}

function labelScope(name, globalCfg, projCfg) {
  if (projCfg && (projCfg.allow || []).some(a => a.toLowerCase() === name.toLowerCase())) return c.magenta('project')
  if ((globalCfg.defaults || []).some(a => a.toLowerCase() === name.toLowerCase())) return c.blue('global ')
  return c.gray('-      ')
}
