import c from 'picocolors'
import { readGlobalConfig, writeGlobalConfig, readProjectConfig, writeProjectConfig } from '../lib/config.js'
import { listStore } from '../lib/store.js'

export function cmdEnable(args) {
  const global = args.includes('-g') || args.includes('--global')
  const name = args.find(a => !a.startsWith('-'))
  if (!name) { console.error(c.red('Usage: skill enable <name> [-g]')); process.exit(1) }

  // must be installed — enabling a typo silently "succeeds" but never activates
  if (!listStore().some(s => s.name.toLowerCase() === name.toLowerCase())) {
    console.error(c.red('Not installed: ' + name))
    console.error(c.gray('  Install first: skill install <source>'))
    process.exit(1)
  }

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
