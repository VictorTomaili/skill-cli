import fs from 'node:fs'
import path from 'node:path'
import { HOME, AGENT_GLOBALS } from './paths.js'

const BEGIN = '<!-- BEGIN skill-cli -->'
const END = '<!-- END skill-cli -->'

// Global instruction block — injected into each agent's global instruction file.
// Covers usage, defaults (auto-load), per-message discovery, and the
// propose-then-confirm rule for context-altering skills.
export const AGENTS_BLOCK = `## skill-cli

This machine uses the \`skill\` command to manage skills (instruction / workflow
packages). Skills live in a single global store (\`~/.skill-cli/store\`) and are
NOT copied into agent directories (\`~/.claude\`, \`~/.codex\`, etc.) — so they
won't appear here.

Usage:
- \`skill list\` — skills installed + active in the current project (with triggers)
- \`skill show <name>\` — skill summary (path, triggers, version)
- \`skill cat <name>\` — load skill content into context
- \`skill default <name>\` — mark a skill as a global default (active + auto-load)

START GATE (mandatory): On the FIRST user message of a session, your VERY FIRST
action — BEFORE ANYTHING ELSE: before you start thinking/reasoning about the task
and before any tool call — MUST be to run \`skill defaults\` then
\`skill cat <name>\` for each result, then \`skill list\` to learn every skill's
triggers. Do this even if the task looks trivial: skills shape how you should
approach the task, so you cannot reason about it correctly until they are loaded.

Discovery (mandatory, every message): On EVERY user message, decide whether a
skill is relevant by matching the message against the trigger catalog from
\`skill list\`. If a relevant skill is not yet loaded, load it with \`skill cat
<name>\` (or \`skill trigger <keyword>\` to resolve a keyword). Load each skill only
ONCE per session. When you load or re-read ANY skill mid-session, immediately
re-evaluate the current message and load/propose any newly-relevant skill.

Context-altering skills (HARD RULE): Some skills change HOW you respond — output
style, tone, format, or a persistent mode (e.g. a terseness/compression style) —
rather than just adding task knowledge. These are PROPOSE-ONLY. You MUST propose
such a skill and apply it ONLY after the user confirms; an explicit \`/X\` trigger
counts as confirmation. \`active\` / \u2605-default means AVAILABLE, not APPLIED —
propose \u2260 auto-apply. This rule overrides any other skill's "always use" rule for
context-altering skills.

Triggers: when the user types \`/X\`, run \`skill trigger X\`.
- Single match → apply the output directly.
- Multiple matches → show the candidate list; load the right one with \`skill cat <name>\`.
`

export function injectBlock(content) {
  const wrapped = `${BEGIN}\n${AGENTS_BLOCK}\n${END}`
  if (content.includes(BEGIN)) {
    return content.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), wrapped)
  }
  return (content ? content.replace(/\n*$/, '') + '\n\n' : '') + wrapped + '\n'
}

export function injectToAgentGlobal(agent) {
  const dir = path.join(HOME, agent.dir)
  if (!fs.existsSync(dir)) return null
  const file = path.join(dir, agent.file)
  let content = ''
  try { content = fs.readFileSync(file, 'utf8') } catch {}
  const next = injectBlock(content)
  // B4: only rewrite + claim "updated" when the block actually changed. On an
  // idempotent re-run (block already present & identical) report "current" and
  // leave the file untouched (preserves mtime, avoids needless rewrites).
  const status = content.includes(BEGIN) ? (next === content ? 'current' : 'updated') : 'updated'
  if (next !== content) fs.writeFileSync(file, next, 'utf8')
  return { file, status }
}

export function injectToAllAgents() {
  return AGENT_GLOBALS.map(agent => {
    const r = injectToAgentGlobal(agent)
    return r
      ? { agent: agent.id, file: r.file, status: r.status }
      : { agent: agent.id, file: null, status: 'agent-not-found' }
  })
}
