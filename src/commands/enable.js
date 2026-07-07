import c from 'picocolors'
import { readGlobalConfig, writeGlobalConfig, readProjectConfig, writeProjectConfig } from '../lib/config.js'

export function cmdEnable(args) {
  const global = args.includes('-g') || args.includes('--global')
  const name = args.find(a => !a.startsWith('-'))
  if (!name) { console.error(c.red('Usage: skill enable <name> [-g]')); process.exit(1) }

  if (global) {
    const cfg = readGlobalConfig()
    if (!cfg.enabled_global.some(a => a.toLowerCase() === name.toLowerCase())) {
      cfg.enabled_global.push(name.toLowerCase()); cfg.enabled_global.sort()
    }
    writeGlobalConfig(cfg)
    console.log(c.green('✓') + ' enabled globally: ' + c.bold(name) + c.gray('  (active in all projects)'))
  } else {
    const cwd = process.cwd()
    const cfg = readProjectConfig(cwd) || { inherit: true, deny: [], allow: [] }
    if (!cfg.allow.some(a => a.toLowerCase() === name.toLowerCase())) cfg.allow.push(name.toLowerCase())
    writeProjectConfig(cwd, cfg)
    console.log(c.green('✓') + ' enabled in project: ' + c.bold(name) + c.gray('  (' + cwd + ')'))
  }
}
