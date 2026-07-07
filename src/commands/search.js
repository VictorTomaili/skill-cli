import { input, checkbox } from '@inquirer/prompts'
import c from 'picocolors'
import { searchSkills } from '../lib/skills-find.js'
import { installSource } from './install.js'

// Interactive search & multi-install (TTY only — cli.js gates on isInteractive).
//
//   type a query → `npx skills find <query>` → multi-select (space to mark,
//   enter to install all marked) → loops back so you can search again:
//   "research" → mark one → "deploy" → mark another → install. Empty query quits.
//
// Non-interactive (agents/CI) never reaches here; they use `skill install <source>`.
export async function cmdSearch() {
  console.log(c.bold('skill search') + c.gray(' — discover & install from the skills ecosystem (skills.sh)'))
  console.log(c.gray('  type a query · space to mark · enter to install marked · empty query to quit'))
  console.log()

  let totalInstalled = 0
  while (true) {
    let query
    try {
      query = await input({ message: 'Search skills:', default: '' })
    } catch {
      break // Ctrl-C / abort
    }
    query = (query || '').trim()
    if (!query) break

    let results
    try {
      results = searchSkills(query)
    } catch (e) {
      console.error(c.red('  ' + e.message))
      continue
    }
    if (results.length === 0) {
      console.log(c.gray('  no skills matched "' + query + '".'))
      continue
    }

    const choices = results.map(r => ({
      name: `${r.skill}  ${c.gray(r.owner + '/' + r.repo)}  ${c.gray('(' + (r.installs || '?') + ' installs)')}`,
      value: r.source,
      short: r.skill,
    }))

    let selected
    try {
      selected = await checkbox({
        message: `Results for "${query}" — space to mark, enter to install:`,
        choices,
        pageSize: 12,
      })
    } catch {
      break
    }
    if (!selected || selected.length === 0) {
      console.log(c.gray('  nothing marked — search again, or empty query to quit.'))
      continue
    }

    for (const src of selected) {
      console.log()
      try {
        installSource(src)
        totalInstalled++
      } catch (e) {
        console.error(c.red('  install failed for ' + src + ': ' + (e.message || e)))
      }
    }
    console.log()
    console.log(c.green(`✓ ${selected.length} selected this round.`) + c.gray('  Search again, or empty query to finish.'))
    console.log()
  }
  console.log(c.gray(`\nDone. ${totalInstalled} skill(s) installed this session.`))
}
