import c from 'picocolors'
import { readGlobalConfig, writeGlobalConfig, readProjectConfig, writeProjectConfig } from '../lib/config.js'

export function cmdDisable(args) {
  const global = args.includes('-g') || args.includes('--global')
  const name = args.find(a => !a.startsWith('-'))
  if (!name) { console.error(c.red('Usage: skill disable <name> [-g]')); process.exit(1) }

  if (global) {
    const cfg = readGlobalConfig()
    cfg.enabled_global = (cfg.enabled_global || []).filter(a => a.toLowerCase() !== name.toLowerCase())
    writeGlobalConfig(cfg)
    console.log(c.green('✓') + ' disabled globally: ' + c.bold(name))
  } else {
    const cwd = process.cwd()
    const cfg = readProjectConfig(cwd) || { inherit: true, deny: [], allow: [] }
    cfg.allow = (cfg.allow || []).filter(a => a.toLowerCase() !== name.toLowerCase())
    writeProjectConfig(cwd, cfg)
    console.log(c.green('✓') + ' disabled in project: ' + c.bold(name))
  }
}
