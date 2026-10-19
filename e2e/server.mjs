import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const dist = new URL('../dist/', import.meta.url)
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' }
let release = 1

const send = (response, status, body, type = 'text/plain') => {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  response.end(body)
}

createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1')
  const releaseMatch = url.pathname.match(/^\/__release\/(1|2)$/)
  if (releaseMatch) { release = Number(releaseMatch[1]); return send(response, 204, '') }
  if (!url.pathname.startsWith('/tracker/')) return send(response, 404, 'Not found')
  const path = url.pathname === '/tracker/' ? 'index.html' : decodeURIComponent(url.pathname.slice('/tracker/'.length))
  const target = normalize(join(new URL(dist).pathname, path))
  if (!target.startsWith(new URL(dist).pathname)) return send(response, 403, 'Forbidden')
  try {
    let body = await readFile(target)
    if (path === 'sw.js' && release === 2) body = Buffer.concat([body, Buffer.from('\n// easytrack-e2e-release-2\n')])
    send(response, 200, body, mime[extname(path)] ?? 'application/octet-stream')
  } catch {
    if (extname(path)) return send(response, 404, 'Not found')
    send(response, 200, await readFile(new URL('index.html', dist)), 'text/html')
  }
}).listen(Number(process.env.E2E_PORT ?? 4173), '127.0.0.1')
