import fs from 'node:fs'
import path from 'node:path'
import c from 'picocolors'
import { CLI_ROOT, STORE_DIR } from '../lib/paths.js'
import { readGlobalConfig, writeGlobalConfig, projectConfigPath, writeProjectConfig } from '../lib/config.js'
import { injectToAllAgents } from '../lib/agents-md.js'

export function cmdInit(args) {
  const global = args.includes('-g') || args.includes('--global')
  return global ? initGlobal() : initProject()
}

function initGlobal() {
  fs.mkdirSync(STORE_DIR, { recursive: true })
  const cfg = readGlobalConfig()
  writeGlobalConfig(cfg)

  console.log(c.green('✓') + ' skill-cli installed globally')
  console.log(c.gray('  store:  ') + STORE_DIR)
  console.log(c.gray('  config: ') + path.join(CLI_ROOT, 'config.yaml'))
  console.log()
  console.log(c.bold('AGENTS.md injection (idempotent):'))
  for (const r of injectToAllAgents()) {
    if (r.status === 'updated') console.log(c.green('  ✓ ') + r.agent + c.gray(' → ' + r.file))
    else if (r.status === 'current') console.log(c.gray('  · ') + r.agent + c.gray(' (already set up)'))
    else console.log(c.gray('  · ') + r.agent + c.gray(' (not found, skipped)'))
  }
  console.log()
  console.log(c.cyan('Next: ') + 'skill install <source>  ' + c.gray('# e.g. vercel-labs/agent-skills'))
}

function initProject() {
  const cwd = process.cwd()
  const cfgPath = projectConfigPath(cwd)
  if (!fs.existsSync(cfgPath)) {
    writeProjectConfig(cwd, { inherit: true, deny: [], allow: [] })
    console.log(c.green('✓') + ' created: ' + c.cyan('skill.config'))
  } else {
    console.log(c.yellow('·') + ' skill.config already exists')
  }
  console.log(c.gray('  inherit: true  → inherits globally-enabled skills'))
  console.log(c.gray('  deny: ["*"] + allow: [...] → pure allowlist (block global, open one by one)'))
  console.log()
  console.log(c.cyan('Active skills: ') + 'skill list')
}
