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
action — BEFORE ANYTHING ELSE: before you start thinking/reasoning about the task
and before any tool call — MUST be to run \`skill active\`. It prints the skill
CATALOG — every ACTIVE skill's name + FULL description (NOT the skill body).
Read it, then for EACH skill decide FROM ITS DESCRIPTION:
- It is STRICTLY NECESSARY to even attempt the task (you cannot do it without
  this knowledge) → load it: \`skill cat <name>\`.
- OTHERWISE PROPOSE it — tell the user it's available and what it does, then apply
  ONLY after they confirm (\`/X\` = confirm). You MUST propose (never silently apply)
  any skill that:
  • changes your communication / response STYLE, tone, format, or a persistent
    mode (e.g. a brevity / compression style);
  • optimizes CONTEXT COST / token usage;
  • is meant to be ACTIVATED BEFORE the work (a workflow / methodology);
  • would make the job EASIER or FASTER — a facilitator / accelerator / tool —
    even if optional. Surface it so the user can opt in.
When unsure whether a skill is necessary or optional → PROPOSE (proposing is the
  safe default; loading is silent).
LOADED ≠ LISTED. A skill is loaded ONLY if you have run \`skill cat <name>\` for
it THIS session. Seeing a skill in \`skill active\` / \`skill list\` does NOT load
it — you then know only its name + description, nothing more. Never infer a skill
is in your context from its name, the \u2605 marker, or an \`active\` status: if you
haven't catted it, treat it as NOT loaded (then decide: cat it, or propose it).
Do not assume a skill is already applied — \`active\`/\u2605-default = AVAILABLE, not
APPLIED. ANY skill can be context-altering; judge from the description — there is
no fixed list and no flag. Do this even if the task looks trivial: skills shape
how you approach it, so you cannot reason about it correctly until you've reviewed
them.

Discovery (every message): On EVERY later user message, re-check the catalog
against the new request; load any newly-relevant functional skill
(\`skill cat <name>\`), and PROPOSE any newly-relevant context-altering one.
Load each skill only ONCE per session (\`skill trigger <keyword>\` resolves a
keyword to a skill).

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
