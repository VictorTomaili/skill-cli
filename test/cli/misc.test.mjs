import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkHome, run, strip } from '../helpers.mjs'

test('no args → prints help, exit 0', () => {
  const r = run(mkHome(), [])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /cross-agent skill manager/)
})

test('--help / -h / help → help text', () => {
  for (const a of ['-h', '--help', 'help']) {
    const r = run(mkHome(), [a])
    assert.equal(r.code, 0, a)
    assert.match(strip(r.out), /Usage \(agent\)/)
  }
})

test('-v / --version → "skill-cli <version>"', () => {
  for (const a of ['-v', '--version']) {
    const r = run(mkHome(), [a])
    assert.equal(r.code, 0, a)
    assert.match(strip(r.out), /^skill-cli \d+\.\d+\.\d+/)
  }
})

test('version is dynamic (matches package.json, not hardcoded)', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'))
  const out = strip(run(mkHome(), ['-v']).out)
  assert.ok(out.includes(pkg.version))
})

test('unknown command → error, exit 1', () => {
  const r = run(mkHome(), ['bogus'])
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Unknown command/)
})

test('alias "ls" → behaves like list', () => {
  const h = mkHome()
  run(h, ['init', '-g'])
  const r = run(h, ['ls'])
  assert.equal(r.code, 0)
  assert.match(strip(r.out), /skill list/)
})

test('alias "add" → behaves like install', () => {
  const r = run(mkHome(), ['add'])   // no-arg → usage error (same as install)
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Usage: skill install/)
})

test('alias "info" → behaves like show', () => {
  const r = run(mkHome(), ['info'])  // no-arg → usage error (same as show)
  assert.notEqual(r.code, 0)
  assert.match(strip(r.err + r.out), /Usage: skill show/)
})
