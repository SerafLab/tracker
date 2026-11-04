import { CommandError } from '../../features/project-board'
import { contractVersion, inputSchemas, dataSchemas, readTools, type ToolName, type ToolResult, type ErrorCode, type ConnectionState } from './schemas'

import { ToolError } from './error'
export { ToolError } from './error'
export type RuntimeDependencies = {
  state(): ConnectionState
  route(): string
  guard(tool: ToolName, input: Record<string, unknown>): void
  execute(tool: ToolName, input: Record<string, unknown>): Promise<unknown>
}
type Entry = { fingerprint: string; promise: Promise<ToolResult> }
export function createToolRuntime(dependencies: RuntimeDependencies, options: { sessionId?: string; responseTimeout?: number } = {}) {
  const sessionId = options.sessionId ?? crypto.randomUUID()
  const entries = new Map<number, Entry>()
  const completed: number[] = []
  let active = true, highWater = 0, pending = false
  const failure = (code: ErrorCode, message: string = code): ToolResult => ({ ok: false, sessionId, error: { code, message } })
  const errorResult = (error: unknown) => error instanceof ToolError || error instanceof CommandError
    ? failure(error.code, error.message) : failure('storage_unavailable', 'Storage did not confirm this operation')
  const ready = () => {
    if (!active) throw new ToolError('disconnected')
    const state = dependencies.state()
    if (state !== 'ready') throw new ToolError(state === 'opening' ? 'disconnected' : state)
  }
  const execute = async (tool: ToolName, input: Record<string, unknown>): Promise<ToolResult> => {
    try {
      ready()
      if (!readTools.has(tool)) dependencies.guard(tool, input)
      const data = await dependencies.execute(tool, input)
      // Results are checked against the same documented browser-compatible contract.
      const parsed = dataSchemas[tool].safeParse(data)
      if (!parsed.success) return failure(readTools.has(tool) ? 'storage_unavailable' : 'outcome_unknown', 'The operation returned an incompatible result; inspect saved data before another mutation')
      return { ok: true, sessionId, data: parsed.data }
    } catch (error) { return errorResult(error) }
  }
  const bounded = (promise: Promise<ToolResult>, signal?: AbortSignal, mutation = true): Promise<ToolResult> => new Promise(resolve => {
    let settled = false
    const done = (result: ToolResult) => {
      if (settled) return
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); resolve(result)
    }
    const abort = () => done(mutation ? failure('outcome_unknown', 'Response interrupted after dispatch; do not replay the mutation') : failure('disconnected', 'Read response interrupted; retry reading when available'))
    const timer = setTimeout(abort, options.responseTimeout ?? 15_000)
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
    promise.then(done)
  })
  return {
    sessionId,
    close() { active = false },
    async call(tool: ToolName, raw: unknown, signal?: AbortSignal): Promise<ToolResult> {
      const parsed = inputSchemas[tool].safeParse(raw)
      if (!parsed.success) return failure('invalid_argument', 'Arguments must match the tool schema, with nonempty names and no unknown fields')
      const input = parsed.data as Record<string, unknown>
      if (!active) return failure('disconnected')
      if (tool === 'get_connection') return { ok: true, sessionId, data: { contractVersion, state: dependencies.state(), route: dependencies.route(), lastMutationSequence: highWater } }
      if (input.sessionId !== sessionId) return failure('disconnected', 'This call targets another or expired document session')
      try { ready() } catch (error) { return errorResult(error) }
      if (signal?.aborted) return failure('disconnected', 'Call canceled before dispatch')
      if (readTools.has(tool)) return bounded(execute(tool, input), signal, false)
      const requestId = input.requestId as number
      const fingerprint = JSON.stringify({ tool, input })
      const entry = entries.get(requestId)
      if (entry) return entry.fingerprint === fingerprint ? bounded(entry.promise, signal) : failure('conflict', 'Request ID already belongs to different arguments')
      if (requestId <= highWater) return failure('conflict', 'Request ID is older than the accepted sequence and cannot be replayed')
      if (pending) return failure('conflict', 'Another command is still running')
      try { dependencies.guard(tool, input) } catch (error) { return errorResult(error) }
      highWater = requestId; pending = true
      // Reserve synchronously before dispatch. A microtask permits duplicate calls to find the same promise.
      const promise = Promise.resolve().then(() => execute(tool, input)).finally(() => {
        pending = false
        completed.push(requestId)
        while (completed.length > 64) entries.delete(completed.shift()!)
      })
      entries.set(requestId, { fingerprint, promise })
      return bounded(promise, signal)
    },
  }
}
export type ToolRuntime = ReturnType<typeof createToolRuntime>
