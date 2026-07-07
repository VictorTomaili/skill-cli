// Are we talking to a human at a terminal? Agents, CI, and pipes have a non-TTY
// stdin and must NOT be shown an interactive prompt (they would hang waiting for
// input that never arrives). Shared by `remove` (y/N confirm) and the TUI commands
// (`search`, and the forthcoming manager). SKILL_CLI_FORCE_TTY lets tests exercise
// the prompt branch on a piped stdin.
export function isInteractive() {
  return process.stdin.isTTY === true || process.env.SKILL_CLI_FORCE_TTY === '1'
}
