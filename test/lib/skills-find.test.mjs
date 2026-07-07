import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFind } from '../../src/lib/skills-find.js'

// Mirrors real `npx skills find` output (incl. ANSI color codes), which the
// parser must strip before extracting owner/repo@skill + installs + URL.
const SAMPLE = `
\x1b[38;5;102mInstall with\x1b[39m npx skills add <owner/repo@skill>

\x1b[38;5;145mmattpocock/skills@research\x1b[39m \x1b[36m25.7K installs\x1b[39m
\x1b[38;5;102m└\x1b[39m https://skills.sh/mattpocock/skills/research

\x1b[38;5;145mfirecrawl/firecrawl-workflows@firecrawl-deep-research\x1b[39m \x1b[36m27.5K installs\x1b[39m
\x1b[38;5;102m└\x1b[39m https://skills.sh/firecrawl/firecrawl-workflows/firecrawl-deep-research
`

test('parseFind: strips ANSI + extracts structured results', () => {
  const r = parseFind(SAMPLE)
  assert.equal(r.length, 2)
  assert.equal(r[0].source, 'mattpocock/skills@research')
  assert.equal(r[0].owner, 'mattpocock')
  assert.equal(r[0].repo, 'skills')
  assert.equal(r[0].skill, 'research')
  assert.equal(r[0].installs, '25.7K')
  assert.equal(r[0].url, 'https://skills.sh/mattpocock/skills/research')
  assert.equal(r[1].skill, 'firecrawl-deep-research')
  assert.equal(r[1].repo, 'firecrawl-workflows')
  assert.equal(r[1].url, 'https://skills.sh/firecrawl/firecrawl-workflows/firecrawl-deep-research')
})

test('parseFind: empty / garbage input → []', () => {
  assert.deepEqual(parseFind(''), [])
  assert.deepEqual(parseFind('no skills here\njust text'), [])
})

test('parseFind: a result line without a following URL → url is empty', () => {
  const r = parseFind('owner/repo@thing 100 installs')
  assert.equal(r.length, 1)
  assert.equal(r[0].url, '')
  assert.equal(r[0].installs, '100')
})
