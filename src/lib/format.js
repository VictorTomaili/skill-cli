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
