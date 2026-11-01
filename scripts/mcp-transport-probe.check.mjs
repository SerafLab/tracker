import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { WebSocket } from 'ws'
import { mkdtemp, readFile, writeFile, symlink, stat, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createPrivateProbeFiles, createProbeRelay } from './mcp-transport-probe.mjs'
const resources = []
afterEach(async () => { for (const relay of resources.splice(0)) await relay.close() })
async function relay() { const value = await createProbeRelay(); resources.push(value); return value }
function connect(value, options = {}) { return new WebSocket(`ws://127.0.0.1:${value.port}/probe`, { origin: 'https://seraflab.github.io', ...options }) }
const opened = socket => new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject) })
const message = socket => new Promise(resolve => socket.once('message', data => resolve(JSON.parse(data.toString()))))
test('probe rejects unapproved origins', async () => {
 const value = await relay(); const socket = connect(value, { origin: 'https://example.org' })
 await assert.rejects(opened(socket), /401/)
 assert.equal(value.marker('test'), false)
})
test('probe rejects invalid authentication and a second executor', async () => {
 const value = await relay(); const bad = connect(value); await opened(bad)
 const rejected = new Promise(resolve => bad.once('close', resolve)); bad.send(JSON.stringify({ type: 'hello', version: 1, token: 'wrong' }))
 assert.equal(await rejected, 1008)
 const socket = connect(value); await opened(socket); const ready = message(socket)
 const token = new URLSearchParams(new URL(value.url).hash.slice(1)).get('token')
 socket.send(JSON.stringify({ type: 'hello', version: 1, token })); assert.deepEqual(await ready, { type: 'ready' })
 const second = connect(value); await opened(second); const denied = new Promise(resolve => second.once('close', resolve))
 second.send(JSON.stringify({ type: 'hello', version: 1, token })); assert.equal(await denied, 1008)
 const command = message(socket); assert.equal(value.marker('synthetic-marker'), true)
 const result = await command; assert.equal(result.type, 'marker'); assert.equal(result.value, 'synthetic-marker')
})

test('probe metadata rejects existing files and symlinks, uses private permissions and removes its key on close', async () => {
 const dir = await mkdtemp(join(tmpdir(), 'probe-files-'))
 try {
  const existing = join(dir, 'existing'); await writeFile(existing, 'preserve', { mode: 0o644 })
  await assert.rejects(createPrivateProbeFiles(existing), { code: 'EEXIST' })
  assert.equal(await readFile(existing, 'utf8'), 'preserve')
  const link = join(dir, 'link'); await symlink(existing, link)
  await assert.rejects(createPrivateProbeFiles(link), { code: 'EEXIST' })
  const path = join(dir, 'new'); const files = await createPrivateProbeFiles(path)
  await files.writeMetadata({ url: 'private' }); await files.writeEvidence([{ marker: 'test' }])
  assert.equal((await stat(path)).mode & 0o777, 0o600)
  assert.equal((await stat(`${path}.evidence.json`)).mode & 0o777, 0o600)
  await files.close(); await assert.rejects(stat(path), { code: 'ENOENT' })
 } finally { await rm(dir, { recursive: true, force: true }) }
})
