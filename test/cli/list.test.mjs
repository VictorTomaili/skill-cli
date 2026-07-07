import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { mkHome, run, putStoreSkill, strip } from '../helpers.mjs'

function setup(skills = ['alpha', 'beta']) {
  const h = mkHome()
  run(h, ['init', '-g'])
  for (const s of skills) putStoreSkill(h, s, { triggers: ['t'] })
  return h
}

test('list: empty store → "Store empty" + install hint', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  const out = strip(run(h, ['list']).out)
  assert.match(out, /Store empty/)
})

test('list: installed skills are passive (○) by default', () => {
  const out = strip(run(setup(), ['list']).out)
  assert.match(out, /○.*alpha/)
  assert.match(out, /○.*beta/)
})

test('list: enabled globally shows active (●) + "global" scope', () => {
  const h = setup()
  run(h, ['enable', 'alpha', '-g'])
  const out = strip(run(h, ['list']).out)
  assert.match(out, /●.*alpha/)
  assert.match(out, /global/)
})

test('list: enabled in project shows "project" scope', () => {
  const h = setup()
  run(h, ['enable', 'alpha'])
  const out = strip(run(h, ['list']).out)
  assert.match(out, /project/)
})

test('list: with no skill.config → scope shows "(global)"', () => {
  const h = setup()
  // no project skill.config created → projCfg null
  const out = strip(run(h, ['list']).out)
  assert.match(out, /\(global\)/)
})

test('list: allowlist deny ["*"] + allow [X] → only X active', () => {
  const h = setup(['alpha', 'beta', 'gamma'])
  run(h, ['enable', 'alpha', '-g'])
  run(h, ['enable', 'beta', '-g'])
  run(h, ['enable', 'gamma', '-g'])
  fs.writeFileSync(path.join(h, 'skill.config'), 'inherit: true\ndeny: ["*"]\nallow: [beta]\n')
  const out = strip(run(h, ['list']).out)
  assert.match(out, /●.*beta/)
  assert.match(out, /○.*alpha/)
  assert.match(out, /○.*gamma/)
})

test('list: inherit:false project → globally-enabled skills go passive', () => {
  const h = setup(['alpha', 'beta'])
  run(h, ['enable', 'alpha', '-g'])
  run(h, ['enable', 'beta', '-g'])
  fs.writeFileSync(path.join(h, 'skill.config'), 'inherit: false\nallow: [beta]\n')
  const out = strip(run(h, ['list']).out)
  assert.match(out, /●.*beta/)
  assert.match(out, /○.*alpha/)
})

test('list: triggers column shows /trigger', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  putStoreSkill(h, 'alpha', { triggers: ['research', 'deep'] })
  const out = strip(run(h, ['list']).out)
  assert.match(out, /\/research/)
})
