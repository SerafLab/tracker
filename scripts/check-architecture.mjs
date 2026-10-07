import { readdir, readFile } from 'node:fs/promises'
import { resolve, dirname, extname, relative, sep } from 'node:path'

const sourceRoot = resolve(process.env.ARCHITECTURE_SOURCE_ROOT ?? 'src')
const extensions = new Set(['.ts', '.tsx'])
const featureRoot = 'features/project-board'

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return extensions.has(extname(entry.name)) && !entry.name.includes('.test.') ? [path] : []
  }))
  return files.flat()
}

function pathFromRoot(path) { return relative(sourceRoot, path).split(sep).join('/') }
function layer(path) {
  const match = pathFromRoot(path).match(/^features\/project-board\/(domain|application|infrastructure|state|presentation)\//)
  return match?.[1]
}
function imports(source) {
  return [...source.matchAll(/^\s*(?:import|export)\s+(?:type\s+)?(?:[^'"\n]*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map(match => match[1])
}

function relativeViolation(from, target) {
  const fromPath = pathFromRoot(from)
  const targetPath = pathFromRoot(target)
  const fromLayer = layer(from)
  const targetLayer = layer(target)
  if (!fromPath.startsWith(featureRoot) && targetPath.startsWith(`${featureRoot}/`) && targetPath !== `${featureRoot}/index`) return 'code outside project-board may import only its public index'
  if (fromLayer === 'domain' && targetLayer && targetLayer !== 'domain') return 'domain may depend only on domain'
  if (fromLayer === 'application' && targetLayer && !['domain', 'application'].includes(targetLayer)) return 'application may depend only on domain or application'
  if (fromLayer === 'infrastructure' && targetLayer && !['domain', 'application', 'infrastructure'].includes(targetLayer)) return 'infrastructure may depend only on domain, application, or infrastructure'
  if (fromLayer === 'state' && targetLayer && !['domain', 'application', 'state'].includes(targetLayer)) return 'state may depend only on domain, application, or state'
  if (fromLayer === 'presentation' && targetLayer && !['domain', 'state', 'presentation'].includes(targetLayer)) return 'presentation may depend only on domain, state, or presentation'
  return undefined
}

const violations = []
for (const file of await sourceFiles(sourceRoot)) {
  for (const specifier of imports(await readFile(file, 'utf8'))) {
    if (specifier === 'dexie' && layer(file) !== 'infrastructure') violations.push(`${pathFromRoot(file)} -> dexie: only infrastructure may import Dexie`)
    if (specifier.startsWith('.')) {
      const target = resolve(dirname(file), specifier)
      const reason = relativeViolation(file, target)
      if (reason) violations.push(`${pathFromRoot(file)} -> ${specifier}: ${reason}`)
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture boundary violations:')
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log('Architecture boundary check passed.')
}
