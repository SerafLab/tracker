import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

function commit() {
  const sha = process.env.GITHUB_SHA?.slice(0, 7)
  if (sha) return sha
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || 'unknown' }
  catch { return 'unknown' }
}

/** Build identity written into backup files; shared by the Vite and Vitest configs. */
export const buildDefine = {
  __APP_VERSION__: JSON.stringify((JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version),
  __APP_COMMIT__: JSON.stringify(commit()),
}
