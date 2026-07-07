import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Single source of truth for the version — read from package.json so it never drifts.
const here = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(path.join(here, '..', '..', 'package.json'), 'utf8'))
export const VERSION = pkg.version
