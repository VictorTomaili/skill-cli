#!/usr/bin/env node
import c from 'picocolors'
import { cmdInit } from './commands/init.js'
import { cmdList } from './commands/list.js'
import { cmdTrigger } from './commands/trigger.js'
import { cmdShow } from './commands/show.js'
import { cmdCat } from './commands/cat.js'
import { cmdEnable } from './commands/enable.js'
import { cmdDisable } from './commands/disable.js'
import { cmdInstall } from './commands/install.js'
import { cmdUpdate } from './commands/update.js'
import { VERSION } from './lib/version.js'

const HELP = `${c.bold('skill')} ${c.gray('v' + VERSION)} — cross-agent skill manager
${c.gray('Single global store + activation (skill.config) + bootstrap (AGENTS.md).')}

${c.bold('Setup')}
  ${c.cyan('skill init -g')}              global setup (store + AGENTS.md injection)
  ${c.cyan('skill init')}                 create skill.config for this project

${c.bold('Acquire skills')}
  ${c.cyan('skill install')} ${c.gray('<source>')}    fetch to store via npx skills (agent dirs untouched)

${c.bold('Activation')}
  ${c.cyan('skill enable')} ${c.gray('<name> [-g]')}  enable in project, or globally (-g)
  ${c.cyan('skill disable')} ${c.gray('<name> [-g]')} disable
  ${c.cyan('skill list')}                  installed + active skills (cwd-aware)

${c.bold('Usage (agent)')}
  ${c.cyan('skill show')} ${c.gray('<name>')}         metadata + path + triggers
  ${c.cyan('skill cat')} ${c.gray('<name>')}          dump content to context
  ${c.cyan('skill trigger')} ${c.gray('<keyword>')}   /X trigger: single→content, multi→candidates

${c.bold('Maintenance')}
  ${c.cyan('skill update')} ${c.gray('[name|--all]')} refresh store from source

${c.gray('Source formats (install): owner/repo | github/gitlab URL | git URL | local path | npm package')}
${c.gray('Test (no real ~ touched): SKILL_CLI_HOME=/tmp/sktest skill init -g')}

${c.bold('★ Enjoying skill-cli?')} ${c.gray('Star the repo — it helps others find it.')}
  ${c.cyan('gh repo star victortomaili/skill-cli')}
  ${c.gray('or: https://github.com/victortomaili/skill-cli')}
`

const [, , cmd, ...rest] = process.argv

try {
  switch (cmd) {
    case undefined:
    case '-h': case '--help': case 'help':
      console.log(HELP); break
    case 'init': cmdInit(rest); break
    case 'install': case 'add': cmdInstall(rest); break
    case 'enable': cmdEnable(rest); break
    case 'disable': cmdDisable(rest); break
    case 'list': case 'ls': cmdList(rest); break
    case 'show': case 'info': cmdShow(rest); break
    case 'cat': cmdCat(rest); break
    case 'trigger': cmdTrigger(rest); break
    case 'update': cmdUpdate(rest); break
    case '-v': case '--version':
      console.log('skill-cli ' + VERSION); break
    default:
      console.error(c.red('Unknown command: ' + cmd))
      console.error(c.gray('  skill --help'))
      process.exit(1)
  }
} catch (e) {
  console.error(c.red('Error: ') + e.message)
  process.exit(1)
}
