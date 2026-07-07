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
import { cmdRemove } from './commands/remove.js'
import { cmdSearch } from './commands/search.js'
import { cmdManager } from './commands/manager.js'
import { cmdDefaults, cmdDefault, cmdUndefault } from './commands/defaults.js'
import { isInteractive } from './lib/interactive.js'
import { VERSION } from './lib/version.js'

const HELP = `${c.bold('skill')} ${c.gray('v' + VERSION)} — cross-agent skill manager
${c.gray('Single global store + activation (skill.config) + bootstrap (AGENTS.md).')}

${c.bold('skill')}                  ${c.gray('interactive manager (↑↓ space d enter — TTY only)')}

${c.bold('Setup')}
  ${c.cyan('skill init -g')}              global setup (store + AGENTS.md injection)
  ${c.cyan('skill init')}                 create skill.config for this project

${c.bold('Acquire skills')}
  ${c.cyan('skill install')} ${c.gray('<source>')}    fetch to store via npx skills (agent dirs untouched)
  ${c.cyan('skill search')}                  interactive search & multi-install (TTY only)

${c.bold('Activation')}
  ${c.cyan('skill enable')} ${c.gray('<name> [-g]')}  allow in project, or global default (-g)
  ${c.cyan('skill disable')} ${c.gray('<name> [-g]')} deny in project, or remove global default (-g)
  ${c.cyan('skill list')}                  installed + active skills (cwd-aware)

${c.bold('Defaults (active + auto-load)')}
  ${c.cyan('skill default')} ${c.gray('<name>')}    mark a default skill (global: active in every project)
  ${c.cyan('skill undefault')} ${c.gray('<name>')}  remove the default flag
  ${c.cyan('skill defaults')}                  list default skills (agent runs this on start)

${c.bold('Usage (agent)')}
  ${c.cyan('skill show')} ${c.gray('<name>')}         metadata + path + triggers
  ${c.cyan('skill cat')} ${c.gray('<name>')}          dump content to context
  ${c.cyan('skill trigger')} ${c.gray('<keyword|name>')}   /X trigger or skill name → content

${c.bold('Maintenance')}
  ${c.cyan('skill update')} ${c.gray('[name|--all]')} refresh store from source
  ${c.cyan('skill remove')} ${c.gray('<name> [-y]')}  remove from store (prompt unless -y / non-TTY)

${c.gray('Source formats (install): owner/repo | github/gitlab URL | git URL | local path | npm package')}
${c.gray('Test (no real ~ touched): SKILL_CLI_HOME=/tmp/sktest skill init -g')}

${c.bold('★ Enjoying skill-cli?')} ${c.gray('Star the repo — it helps others find it.')}
  ${c.cyan('gh repo star victortomaili/skill-cli')}
  ${c.gray('or: https://github.com/victortomaili/skill-cli')}
`

const [, , cmd, ...rest] = process.argv

async function main() {
  switch (cmd) {
    case 'manager': case 'ui':
      if (!isInteractive()) {
        console.error(c.red("'skill manager' is interactive — run it in a terminal, or use 'skill list'."))
        process.exit(1)
      }
      await cmdManager()
      break
    case undefined:
      if (isInteractive()) { await cmdManager() }
      else { console.log(HELP) }
      break
    case '-h': case '--help': case 'help':
      console.log(HELP); break
    case 'init': cmdInit(rest); break
    case 'install': case 'add':
      // No source + a real terminal → interactive search TUI. Agents/CI (non-TTY)
      // and explicit sources stay non-interactive.
      if (rest.length === 0 && isInteractive()) { await cmdSearch(rest) }
      else { cmdInstall(rest) }
      break
    case 'search': case 'browse':
      if (!isInteractive()) {
        console.error(c.red("'skill search' is interactive — run it in a terminal, or use 'skill install <source>'."))
        process.exit(1)
      }
      await cmdSearch(rest)
      break
    case 'enable': cmdEnable(rest); break
    case 'disable': cmdDisable(rest); break
    case 'list': case 'ls': cmdList(rest); break
    case 'defaults': cmdDefaults(rest); break
    case 'default': case 'def': cmdDefault(rest); break
    case 'undefault': case 'undef': cmdUndefault(rest); break
    case 'show': case 'info': cmdShow(rest); break
    case 'cat': cmdCat(rest); break
    case 'trigger': cmdTrigger(rest); break
    case 'update': cmdUpdate(rest); break
    case 'remove': case 'rm': case 'uninstall': cmdRemove(rest); break
    case '-v': case '--version':
      console.log('skill-cli ' + VERSION); break
    default:
      console.error(c.red('Unknown command: ' + cmd))
      console.error(c.gray('  skill --help'))
      process.exit(1)
  }
}

main().catch(e => {
  console.error(c.red('Error: ') + e.message)
  process.exit(1)
})
