import fs from 'node:fs'
import path from 'node:path'
import { createPrompt, useState, useKeypress, usePrefix, isEnterKey, isUpKey, isDownKey } from '@inquirer/core'
import c from 'picocolors'
import { STORE_DIR } from '../lib/paths.js'
import { listStore } from '../lib/store.js'
import { readGlobalConfig, writeGlobalConfig, readProjectConfig, writeProjectConfig, computeEffective, computeDefaults } from '../lib/config.js'
import { cleanConfig } from './remove.js'
import { trunc, sourceLabel } from '../lib/format.js'

const KEYS = c.gray('↑↓ move · space toggle here · a global default · d delete · enter view · q/esc quit')

// Pure decision: given the current configs, compute the new {allow, deny} arrays
// that flip `name`'s active state in THIS project. No I/O → unit-testable without
// SKILL_CLI_HOME. The global `defaults` list is untouched (the manager toggle is project-scoped).
//   passive → add to project allow (active here)
//   active via project allow → remove from allow
//   active via global only → add a local deny so it goes passive HERE
export function computeToggle(installed, globalCfg, projCfg, name) {
  const lc = String(name).toLowerCase()
  const p = {
    inherit: projCfg?.inherit !== false,
    deny: [...(projCfg?.deny || [])],
    allow: [...(projCfg?.allow || [])],
  }
  const active = computeEffective(installed, globalCfg, p).includes(name)
  const isGlobal = (globalCfg.defaults || []).some(a => String(a).toLowerCase() === lc)
  const isProjectAllow = p.allow.some(a => String(a).toLowerCase() === lc)
  if (active) {
    p.allow = p.allow.filter(a => String(a).toLowerCase() !== lc)
    if (isGlobal && !isProjectAllow) {
      if (!p.deny.some(d => String(d).toLowerCase() === lc)) p.deny.push(lc)
    }
  } else {
    p.deny = p.deny.filter(d => String(d).toLowerCase() !== lc)
    if (!p.allow.some(a => String(a).toLowerCase() === lc)) p.allow.push(lc)
  }
  return { allow: p.allow, deny: p.deny }
}

// Apply computeToggle's decision to disk and return a status line for the UI.
export function toggleActive(name, cwd = process.cwd()) {
  const installed = listStore()
  const g = readGlobalConfig()
  const p = readProjectConfig(cwd) || { inherit: true, deny: [], allow: [] }
  const wasActive = computeEffective(installed, g, p).includes(name)
  const next = computeToggle(installed, g, p, name)
  writeProjectConfig(cwd, { ...p, ...next })
  return wasActive ? (c.gray('· disabled in project: ') + name) : (c.green('✓ enabled in project: ') + name)
}

function removeOne(name) {
  fs.rmSync(path.join(STORE_DIR, name), { recursive: true, force: true })
  cleanConfig(name)
}

// Bounded view of SKILL.md — the full file can be large and inquirer does not scroll.
function viewBody(s) {
  const file = path.join(STORE_DIR, s.name, 'SKILL.md')
  let content
  try { content = fs.readFileSync(file, 'utf8') } catch { return c.gray('  (no SKILL.md)') }
  const lines = content.split(/\r?\n/)
  const max = 22
  const shown = lines.slice(0, max).map(l => (l ? '  ' + l : ''))
  if (lines.length > max) shown.push(c.gray('  … ' + (lines.length - max) + ' more lines — `skill cat ' + s.name + '`'))
  return shown.join('\n')
}

// Pure decision: the new global `defaults` array after toggling `name`'s default
// flag. (Defaults are a GLOBAL concept — active by default + auto-load. The
// manager `a` key edits this list; `space` does the per-folder allow/deny.)
export function computeToggleDefault(list, name) {
  const lc = String(name).toLowerCase()
  const defs = [...(list || [])]
  return defs.some(d => String(d).toLowerCase() === lc)
    ? defs.filter(d => String(d).toLowerCase() !== lc)
    : [...defs, lc]
}

// Apply the default toggle to the GLOBAL config and return a status line for the UI.
function toggleDefault(name) {
  const installed = listStore()
  const g = readGlobalConfig()
  const wasDefault = computeDefaults(installed, g).includes(name)
  g.defaults = computeToggleDefault(g.defaults, name)
  writeGlobalConfig(g)
  return wasDefault ? (c.gray('· un-defaulted: ') + name) : (c.yellow('★ default: ') + name + c.gray(' (active + auto-load)'))
}

// Clamp a cursor move so it can't leave the list bounds (pure → unit-tested).
export function moveCursor(cur, length, delta) {
  if (length <= 0) return 0
  return Math.max(0, Math.min(length - 1, cur + delta))
}

// One custom prompt owns the whole keyboard loop (select/checkbox can't do `d`/view).
//   ↑↓ move · space toggle active in this project · d delete (confirm) ·
//   enter view the SKILL.md · q quit. Re-reads the store/config every render so
//   toggles & deletes are reflected immediately.
const managerPrompt = createPrompt((_config, done) => {
  const [cursor, setCursor] = useState(0)
  const [mode, setMode] = useState('list')      // 'list' | 'confirm' | 'view'
  const [tick, setTick] = useState(0)           // bump (a VALUE, not a fn) to force a re-render
  const [status, setStatus] = useState('')
  const prefix = usePrefix({ theme: { prefix: { idle: c.cyan('?'), done: c.cyan('✓') } } })

  const installed = listStore()
  const g = readGlobalConfig()
  const p = readProjectConfig()
  const eff = computeEffective(installed, g, p)
  const defs = computeDefaults(installed, g)
  const cur = installed.length ? Math.max(0, Math.min(cursor, installed.length - 1)) : 0
  const s = installed[cur]

  useKeypress((key) => {
    if (mode === 'view') { setMode('list'); return }            // any key → back to list
    if (mode === 'confirm') {
      if (key.name === 'y') {
        if (s) { removeOne(s.name); setStatus(c.red('✓ removed ') + s.name) }
        setMode('list'); setTick(tick + 1)
      } else if (key.name === 'escape' || key.name === 'n' || (key.ctrl && key.name === 'c')) {
        setMode('list'); setStatus(c.gray('cancelled'))
      }
      return
    }
    // list mode
    // NB: @inquirer/core's useState setter takes a VALUE (there is NO functional
    // updater like React's). We read the clamped `cur` from THIS render's closure —
    // useKeypress keeps the handler fresh on every render, so it's always current.
    if (isUpKey(key)) { setCursor(moveCursor(cur, installed.length, -1)); setStatus('') }
    else if (isDownKey(key)) { setCursor(moveCursor(cur, installed.length, 1)); setStatus('') }
    else if (key.name === 'space') { if (s) { setStatus(toggleActive(s.name)); setTick(tick + 1) } }
    else if (key.name === 'a') { if (s) { setStatus(toggleDefault(s.name)); setTick(tick + 1) } }
    else if (key.name === 'd') { if (s) { setMode('confirm'); setStatus('') } }
    else if (isEnterKey(key)) { if (s) { setMode('view'); setStatus('') } }
    else if (key.name === 'q' || key.name === 'escape' || (key.ctrl && key.name === 'c')) done()
  })

  // ── render ──
  if (mode === 'view' && s) {
    return prefix + ' ' + c.bold(s.name) + c.gray('  (any key to go back)') + '\n' + viewBody(s)
  }
  const lines = [
    prefix + ' ' + c.bold('skill manager') + c.gray(' — project: ') + c.magenta(process.cwd()),
    c.gray('  ' + installed.length + ' installed · ' + eff.length + ' active here · ' + defs.length + ' global default' + (defs.length === 1 ? '' : 's')),
    '',
  ]
  for (let i = 0; i < installed.length; i++) {
    const sk = installed[i]
    const active = eff.includes(sk.name)
    const isDef = defs.includes(sk.name)
    const arrow = i === cur ? c.cyan('❯') : ' '
    const mark = active ? c.green('●') : c.gray('○')
    const star = isDef ? c.yellow('★') : c.gray('·')
    const src = sourceLabel(c, active, isDef)
    const trg = sk.triggers.length ? '  ' + c.gray('/' + sk.triggers.join(', /')) : ''
    const nameStr = sk.name.padEnd(22)
    const nameCol = i === cur ? c.bold(nameStr) : nameStr
    lines.push(`${arrow} ${mark} ${star} ${nameCol} ${c.gray(String(sk.version || '').padEnd(7))} ${src}${trg}`)
    if (i === cur && sk.description) lines.push(c.gray('      ' + trunc(sk.description, 60)))
  }
  lines.push(c.gray('  ' + '─'.repeat(62)))
  lines.push('  ' + c.green('●') + c.gray(' active here   ') + c.gray('○ passive   ') + c.yellow('★') + c.gray(' global default   ') + c.gray('· not default'))
  lines.push(c.gray('  source: global = inherited default · project = on here only · global·off = default off here'))
  lines.push('  ' + KEYS)
  if (mode === 'confirm') {
    lines.push('')
    lines.push('  ' + c.yellow('Delete ' + c.bold(s ? s.name : '') + '? [y/N] ') + c.gray('(N keeps it)'))
  } else if (status) {
    lines.push('  ' + status)
  }
  return lines.join('\n')
})

// `skill` (no args) / `skill manager` / `skill ui` on a terminal. Agents/CI never
// reach here (cli.js gates on isInteractive).
export async function cmdManager() {
  const installed = listStore()
  if (installed.length === 0) {
    console.log(c.yellow('Store empty.') + c.gray('  Install a skill first: ') + c.cyan('skill install <source>'))
    return
  }
  try {
    await managerPrompt({})
  } catch { /* Ctrl-C / abort — fall through to the footer */ }
  const g = readGlobalConfig()
  const p = readProjectConfig()
  const eff = computeEffective(listStore(), g, p)
  console.log()
  console.log(c.gray('Closed. ' + listStore().length + ' installed · ' + eff.length + ' active in ' + process.cwd()))
}
