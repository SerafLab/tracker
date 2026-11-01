import { randomBytes, randomUUID } from 'node:crypto'
import { open, unlink } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { WebSocketServer, WebSocket } from 'ws'

// Isolated experiment: no task API, no access to application records.
export async function createProbeRelay({ onExpire = () => {}, origin = 'https://seraflab.github.io', appURL = 'https://seraflab.github.io/tracker/mcp-transport-probe.html', onEvidence = () => {} } = {}) {
  const token = randomBytes(32).toString('hex')
  let bound
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0, maxPayload: 4096, verifyClient: info => info.origin === origin && info.req.headers.host === `127.0.0.1:${server.address().port}` && info.req.url === '/probe' })
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject) })
  server.on('connection', socket => {
    let authenticated = false
    const timeout = setTimeout(() => socket.close(1008, 'Handshake timeout'), 5000)
    socket.on('close', () => { clearTimeout(timeout); if (bound === socket) bound = undefined })
    socket.on('message', data => {
      try {
        const message = JSON.parse(data.toString())
        if (!authenticated) {
          if (bound || message.type !== 'hello' || message.version !== 1 || message.token !== token) return socket.close(1008, 'Rejected')
          authenticated = true; bound = socket; clearTimeout(timeout)
          socket.send(JSON.stringify({ type: 'ready' })); onEvidence({ type: 'handshake', at: new Date().toISOString() }); return
        }
        if (message.type === 'result' && typeof message.id === 'string' && typeof message.marker === 'string') onEvidence({ type: 'result', id: message.id, marker: message.marker, previousMarker: typeof message.previousMarker === 'string' ? message.previousMarker : null, visibility: message.visibility === 'hidden' ? 'hidden' : 'visible', at: new Date().toISOString() })
        else socket.close(1008, 'Unknown message')
      } catch { socket.close(1008, 'Invalid message') }
    })
  })
  const port = server.address().port
  const expiry = setTimeout(() => { for (const socket of server.clients) socket.terminate(); server.close(); onExpire() }, 15 * 60 * 1000)
  expiry.unref()
  return {
    port, url: `${appURL}#port=${port}&token=${token}`,
    marker(value) { if (bound?.readyState !== WebSocket.OPEN) return false; bound.send(JSON.stringify({ type: 'marker', id: randomUUID(), value })); return true },
    async close() { clearTimeout(expiry); for (const socket of server.clients) socket.terminate(); await new Promise(resolve => server.close(resolve)) },
  }
}

export async function createPrivateProbeFiles(path) {
 const metadata = await open(path, 'wx', 0o600)
 let evidence
 try { evidence = await open(`${path}.evidence.json`, 'wx', 0o600) }
 catch (error) { await metadata.close(); await unlink(path); throw error }
 let writes = Promise.resolve()
 return {
  writeMetadata: value => metadata.writeFile(JSON.stringify(value)),
  writeEvidence(value) {
   writes = writes.then(async () => { const data = Buffer.from(JSON.stringify(value, null, 2)); await evidence.write(data, 0, data.length, 0); await evidence.truncate(data.length) })
   return writes
  },
  async close() { await writes; await Promise.all([metadata.close(), evidence.close()]); await unlink(path) },
 }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const path = process.argv[2]
 if (!path) throw new Error('Supply a new private metadata file path')
 const files = await createPrivateProbeFiles(path)
 const evidence = []
 let stopping = false
 const stop = async () => { if (stopping) return; stopping = true; await relay.close(); await files.close(); process.exit(0) }
 const relay = await createProbeRelay({ onExpire: () => void stop(), onEvidence: entry => { evidence.push(entry); void files.writeEvidence(evidence).catch(() => console.error('Cannot write experiment evidence')) } })
 await files.writeMetadata({ port: relay.port, url: relay.url })
 console.error(`Probe listening on loopback port ${relay.port}; connection URL is in the private metadata file`)
 process.stdin.setEncoding('utf8')
 process.stdin.on('data', value => { if (!relay.marker(value.trim().slice(0, 100))) console.error('No authenticated experiment tab') })
 process.on('SIGINT', () => void stop())
 process.on('SIGTERM', () => void stop())
}
