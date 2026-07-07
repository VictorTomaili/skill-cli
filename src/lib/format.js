// Shared output helpers.

// Truncate to n chars, collapsing any newlines to spaces (keeps single-line output).
export function trunc(s, n) {
  s = String(s ?? '').replace(/[\r\n]+/g, ' ').trim()
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// Left-pad a string to a fixed column width.
export function pad(s, n = 22) {
  return (String(s) + ' '.repeat(n)).slice(0, n)
}

// WHY a skill is (or isn't) active in THIS project — source of activation.
// Derived from `active` (computeEffective) + `isDefault` (global defaults), so it
// can never disagree with the ●/○ marker. Shared by `skill list` + the manager.
//   global     = inherited global default, active here
//   global·off = global default, but this project denies it (passive here)
//   project    = active via the project allow-list (not a global default)
//   —          = passive
export function sourceLabel(c, active, isDefault) {
  if (isDefault && active) return c.blue('global'.padEnd(10))
  if (isDefault) return c.gray('global·off'.padEnd(10))
  if (active) return c.magenta('project'.padEnd(10))
  return c.gray('—'.padEnd(10))
}
