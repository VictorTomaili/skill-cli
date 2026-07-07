import c from 'picocolors'
import { readGlobalConfig, writeGlobalConfig, readProjectConfig, writeProjectConfig } from '../lib/config.js'

export function cmdDisable(args) {
  const global = args.includes('-g') || args.includes('--global')
  const name = args.find(a => !a.startsWith('-'))
  if (!name) { console.error(c.red('Usage: skill disable <name> [-g]')); process.exit(1) }

  if (global) {
    const cfg = readGlobalConfig()
    const had = (cfg.enabled_global || []).some(a => a.toLowerCase() === name.toLowerCase())
    cfg.enabled_global = (cfg.enabled_global || []).filter(a => a.toLowerCase() !== name.toLowerCase())
    writeGlobalConfig(cfg)
    console.log(had
      ? (c.green('✓') + ' disabled globally: ' + c.bold(name))
      : (c.gray('·') + ' not enabled globally: ' + c.bold(name) + c.gray(' (nothing to do)')))
  } else {
    const cwd = process.cwd()
    const cfg = readProjectConfig(cwd) || { inherit: true, deny: [], allow: [] }
    const had = (cfg.allow || []).some(a => a.toLowerCase() === name.toLowerCase())
    cfg.allow = (cfg.allow || []).filter(a => a.toLowerCase() !== name.toLowerCase())
    writeProjectConfig(cwd, cfg)
    console.log(had
      ? (c.green('✓') + ' disabled in project: ' + c.bold(name))
      : (c.gray('·') + ' not enabled in project: ' + c.bold(name) + c.gray(' (nothing to do)')))
  }
}
