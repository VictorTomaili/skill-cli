import { input, checkbox } from '@inquirer/prompts'
import c from 'picocolors'
import { searchSkills } from '../lib/skills-find.js'
import { installSource } from './install.js'

// Run an @inquirer prompt that ALSO exits on ESC. The prebuilt input/checkbox
// prompts only respond to Enter / Ctrl-C; we wire ESC to abort via the `signal`
// (passed as the prompt's 2nd context arg → createPrompt's abort path, which
// rejects with AbortPromptError). Ctrl-C still works (ExitPromptError). Tested
// without a TTY by pre-aborting the signal (see test/cli/search.test.mjs).
//
// During a prompt createPrompt's readline (terminal:true) emits `keypress` on
// process.stdin, so our listener receives the ESC and aborts. Exported so the
// error-handling path is unit-testable.
export async function withEscExit(run) {
  const controller = new AbortController()
  const onKey = (_ch, key) => { if (key && key.name === 'escape') controller.abort() }
  process.stdin.on('keypress', onKey)
  try {
    return { aborted: false, value: await run(controller.signal) }
  } catch (e) {
    if (e && /^(Abort|Exit|Cancel)PromptError$/.test(e.name)) return { aborted: true }
    throw e
  } finally {
    process.stdin.removeListener('keypress', onKey)
  }
}

// Interactive search & multi-install (TTY only — cli.js gates on isInteractive).
//
//   type a query → `npx skills find <query>` → multi-select (space to mark,
//   enter to install all marked) → loops back so you can search again.
//   ESC (or an empty query) at any prompt quits.
//
// Non-interactive (agents/CI) never reaches here; they use `skill install <source>`.
export async function cmdSearch() {
  console.log(c.bold('skill search') + c.gray(' — discover & install from the skills ecosystem (skills.sh)'))
  console.log(c.gray('  type a query · space to mark · enter to install marked · esc or empty query to quit'))
  console.log()

  let totalInstalled = 0
  while (true) {
    const q = await withEscExit(signal => input({ message: 'Search skills:', default: '' }, { signal }))
    if (q.aborted) break                       // ESC / Ctrl-C → exit
    const query = (q.value || '').trim()
    if (!query) break                          // empty Enter → exit

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

    const sel = await withEscExit(signal => checkbox({
      message: `Results for "${query}" — space to mark, enter to install (esc to quit):`,
      choices,
      pageSize: 12,
    }, { signal }))
    if (sel.aborted) break                     // ESC / Ctrl-C → exit
    const selected = sel.value || []
    if (selected.length === 0) {
      console.log(c.gray('  nothing marked — search again, or esc / empty query to quit.'))
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
    console.log(c.green(`✓ ${selected.length} selected this round.`) + c.gray('  Search again, or esc / empty query to finish.'))
    console.log()
  }
  console.log(c.gray(`\nDone. ${totalInstalled} skill(s) installed this session.`))
}
