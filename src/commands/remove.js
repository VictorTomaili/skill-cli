import fs from 'node:fs'
import path from 'node:path'
import c from 'picocolors'
import { STORE_DIR } from '../lib/paths.js'
import { listStore } from '../lib/store.js'
import { readGlobalConfig, writeGlobalConfig, readProjectConfig, writeProjectConfig } from '../lib/config.js'
import { pad } from '../lib/format.js'
import { isInteractive } from '../lib/interactive.js'

// Read one line from stdin (fd 0) synchronously. Only ever called when stdin is
// a TTY (or SKILL_CLI_FORCE_TTY is set), so it blocks for the user's keystrokes.
function readLine() {
  let line = ''
  const buf = Buffer.alloc(1)
  while (true) {
    let n
    try { n = fs.readSync(0, buf, 0, 1, null) } catch { return line }
    if (n === 0) break                       // EOF
    const ch = buf[0]
    if (ch === 0x0A || ch === 0x0D) break    // \n or \r — end of line
    if (ch === 0x03) process.exit(130)       // Ctrl-C
    line += String.fromCharCode(ch)
  }
  return line.trim()
}

function confirm(question) {
  process.stdout.write(question)
  const a = readLine().toLowerCase()
  return a === 'y' || a === 'yes'
}

// `skill remove <name>... [-y|--yes|-f|--force]`
//
//   TTY + no --yes  → y/N confirmation prompt (default keeps the skill)
//   non-TTY (agent/CI/pipe) OR --yes → remove without prompting
//
// The destination name is canonicalized via listStore (case-insensitive, and an
// unknown/`../x` name can never reach path.join(STORE_DIR, name)). Also drops the
// skill from the global enabled list and the current project's allow-list; other
// projects may keep a now-dangling allow entry, but computeEffective filters
// those out (harmless).
export function cmdRemove(args) {
  const assumeYes = args.some(a => ['-y', '--yes', '-f', '--force'].includes(a))
  const requested = args.filter(a => !a.startsWith('-'))

  if (requested.length === 0) {
    console.error(c.red('Usage: skill remove <name>... [-y]'))
    console.error(c.gray('  Removes skill(s) from the store. Agents/CI auto-skip the prompt, or pass -y.'))
    process.exit(1)
  }

  const installed = listStore()
  const byLower = new Map(installed.map(s => [s.name.toLowerCase(), s.name]))
  const targets = []
  const seen = new Set()
  for (const a of requested) {
    const canon = byLower.get(a.toLowerCase())
    if (!canon) { console.log(c.yellow('  · ' + pad(a)) + c.yellow('not installed — skipping')); continue }
    // dedupe exact + case-variant duplicates (foo, FOO, foo → a single removal,
    // not three, so the count and prompt list stay accurate)
    const key = canon.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    targets.push(canon)
  }

  if (targets.length === 0) {
    console.log(c.gray('Nothing to remove.'))
    return
  }

  if (isInteractive() && !assumeYes) {
    const what = targets.length === 1 ? `skill ${c.bold(targets[0])}` : `${targets.length} skills`
    const list = targets.map(t => '  • ' + t).join('\n')
    if (!confirm(c.yellow(`About to remove ${what}:\n${list}\n`) + c.bold('Remove? [y/N] '))) {
      console.log(c.gray('Aborted. Nothing removed.'))
      return
    }
  }

  let removed = 0
  for (const name of targets) {
    fs.rmSync(path.join(STORE_DIR, name), { recursive: true, force: true })
    cleanConfig(name)
    console.log(c.green('  ✓ ') + c.bold(pad(name)) + c.gray('removed'))
    removed++
  }
  console.log()
  console.log(c.green(`✓ ${removed} skill(s) removed`))
}

// Drop the skill from the global enabled list and the current project allow-list.
// Exported so the interactive manager can reuse it on its `d` (delete) action.
export function cleanConfig(name) {
  const g = readGlobalConfig()
  if ((g.defaults || []).some(a => a.toLowerCase() === name.toLowerCase())) {
    g.defaults = (g.defaults || []).filter(a => a.toLowerCase() !== name.toLowerCase())
    writeGlobalConfig(g)
  }
  const cwd = process.cwd()
  const p = readProjectConfig(cwd)
  if (p && (p.allow || []).some(a => a.toLowerCase() === name.toLowerCase())) {
    p.allow = (p.allow || []).filter(a => a.toLowerCase() !== name.toLowerCase())
    writeProjectConfig(cwd, p)
  }
}
