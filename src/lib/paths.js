import os from 'node:os'
import path from 'node:path'

// SKILL_CLI_HOME overrides ALL home references — safe for testing. In production
// this is the real os.homedir(); ~/.skill-cli, ~/.claude, etc. all derive from it.
export const HOME = process.env.SKILL_CLI_HOME || os.homedir()

export const CLI_ROOT = path.join(HOME, '.skill-cli')
export const STORE_DIR = path.join(CLI_ROOT, 'store')
export const GLOBAL_CONFIG = path.join(CLI_ROOT, 'config.yaml')

export const PROJECT_CONFIG = 'skill.config'

// Each agent's global instruction file. `skill init -g` injects an idempotent
// block into these. (Cursor uses .cursor/rules with a different format — adapter later.)
export const AGENT_GLOBALS = [
  { id: 'claude', dir: '.claude', file: 'CLAUDE.md' },
  { id: 'codex', dir: '.codex', file: 'AGENTS.md' },
  { id: 'gemini', dir: '.gemini', file: 'GEMINI.md' },
  // pi loads global context from ~/.pi/agent/AGENTS.md (or CLAUDE.md).
  { id: 'pi', dir: '.pi/agent', file: 'AGENTS.md' },
]
