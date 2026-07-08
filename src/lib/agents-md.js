import fs from 'node:fs'
import path from 'node:path'
import { HOME, AGENT_GLOBALS } from './paths.js'

const BEGIN = '<!-- BEGIN skill-cli -->'
const END = '<!-- END skill-cli -->'

// Global instruction block — injected into each agent's global instruction file.
// `skill active` (alias: `status`) is a description-only CATALOG of ACTIVE skills;
// decides per skill: functional → `skill cat`, context-altering → propose. No flag
// or fixed list — detection is the agent's judgment from the description, so it
// covers any skill (including ones installed later).
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
action — BEFORE ANYTHING ELSE (before thinking, before any tool call) — MUST be to
run \`skill active\`. It lists each ACTIVE skill's name + FULL description (never the
body). Read it, then for EACH skill classify which axis it moves and ACT — there is
no discretion and no third option:
- moves CORRECTNESS or QUALITY → load it now: \`skill cat <name>\`.
- moves COST, SPEED, or response STYLE → PROPOSE it. These are TRADE-OFFS — the
  USER decides them, NEVER you. Even if you are SURE one would hurt THIS task, you
  still ASK: "Enable <name>? It <one-line benefit>." (apply only on yes). They move
  an axis on EVERY task by definition (every reply has a token cost, a length, a
  style, a speed), so the thoughts "not relevant to this task", "not needed here",
  "the user didn't request it", and "skip unless needed" are FORBIDDEN — each one
  is you STEALING the user's decision. Deciding a trade-off is not your role;
  surfacing it is. A line in a table is NOT proposing — you must actually ask.
- moves none of the above → skip.
When unsure if a skill moves an axis → PROPOSE (ask). LOADED \u2260 LISTED: a skill is
loaded only if you \`cat\`-ed it this session — listing it, its \u2605, or its \`active\`
status is NOT loading; active/\u2605 means AVAILABLE, not APPLIED.
PRIORITIES: correctness > quality > cost (cheap) > speed — never trade correctness
or quality for speed or cost.
Discovery: on EVERY later message, re-run this classification; load newly-relevant
correctness/quality skills, PROPOSE newly-relevant cost/style/speed ones. Load each
skill only ONCE per session (\`skill trigger <keyword>\` resolves a keyword).

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
