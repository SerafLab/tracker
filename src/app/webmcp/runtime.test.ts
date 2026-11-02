import { describe, expect, it, vi } from 'vitest'
import { createToolRuntime, ToolError, type RuntimeDependencies } from './runtime'
import { dataSchemas, inputSchemas, type ConnectionState } from './schemas'
import { registerPageTools, type NativeTool } from './registration'
const sessionId = 'session'
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes }); return { promise, resolve } }
const project = { id: 'project', name: 'Name', createdAt: 'now' }
function setup(overrides: Partial<RuntimeDependencies> = {}, responseTimeout = 15_000) {
  const dependencies: RuntimeDependencies = { state: () => 'ready', route: () => '', guard: vi.fn(), execute: vi.fn(async () => ({ saved: true, project })), ...overrides }
  return { dependencies, runtime: createToolRuntime(dependencies, { sessionId, responseTimeout }) }
}
describe('native contract schemas', () => {
  it('publishes exactly 14 strict tools, validates defaults and rejects unsupported fields', () => {
    expect(Object.keys(inputSchemas)).toHaveLength(14)
    expect(Object.keys(inputSchemas)).toEqual(Object.keys(dataSchemas))
    expect(inputSchemas.create_card.parse({ sessionId, requestId: 1, statusId: 's', name: 'N' })).toMatchObject({ important: false, urgent: false })
    for (const raw of [ { sessionId, requestId: 0, name: 'N' }, { sessionId, requestId: Number.MAX_SAFE_INTEGER + 1, name: 'N' }, { sessionId, requestId: 1, name: '  ' }, { sessionId, requestId: 1, name: 'N', initialStatusNames: [] } ]) expect(inputSchemas.create_project.safeParse(raw).success).toBe(false)
    expect(inputSchemas.update_card.safeParse({ sessionId, requestId: 1, cardId: 'c', name: 'N', important: false, urgent: false, description: 'Forbidden' }).success).toBe(false)
    expect(inputSchemas.move_card.safeParse({ sessionId, requestId: 1, cardId: 'c', statusId: 's', expected: { statusId: 'old', important: false, urgent: false }, beforeCardId: null }).success).toBe(false)
    expect(inputSchemas.delete_card.safeParse({ sessionId, requestId: 1, cardId: 'c', confirm: false }).success).toBe(false)
  })
  it.each(['opening', 'ready', 'storage_unavailable', 'restart_required'] as ConnectionState[])('reports %s without accessing task storage', async state => {
    const { runtime, dependencies } = setup({ state: () => state })
    expect(await runtime.call('get_connection', {})).toEqual({ ok: true, sessionId, data: { contractVersion: 1, state, route: '', lastMutationSequence: 0 } })
    if (state !== 'ready') expect(await runtime.call('list_projects', { sessionId })).toMatchObject({ ok: false, error: { code: state === 'opening' ? 'disconnected' : state } })
    expect(dependencies.execute).not.toHaveBeenCalled()
  })
})
it('rejects wrong/expired sessions before storage and keeps two documents independent', async () => {
  const first = setup(), second = setup()
  expect(await first.runtime.call('list_projects', { sessionId: 'other' })).toMatchObject({ error: { code: 'disconnected' } })
  first.runtime.close()
  expect(await first.runtime.call('create_project', { sessionId, requestId: 1, name: 'N' })).toMatchObject({ error: { code: 'disconnected' } })
  expect(first.dependencies.execute).not.toHaveBeenCalled()
  expect(await second.runtime.call('create_project', { sessionId, requestId: 1, name: 'N' })).toMatchObject({ ok: true })
})
it('shares pending duplicate and cached result, refuses mismatched reuse and busy calls without queueing', async () => {
  const pending = deferred<unknown>(), { runtime, dependencies } = setup({ execute: vi.fn(() => pending.promise) })
  const input = { sessionId, requestId: 1, name: 'N' }
  const first = runtime.call('create_project', input), duplicate = runtime.call('create_project', input)
  await Promise.resolve()
  expect(dependencies.execute).toHaveBeenCalledOnce()
  expect(await runtime.call('create_project', { ...input, name: 'Different' })).toMatchObject({ error: { code: 'conflict' } })
  expect(await runtime.call('create_project', { ...input, requestId: 2 })).toMatchObject({ error: { code: 'conflict' } })
  pending.resolve({ saved: true, project })
  expect(await duplicate).toEqual(await first)
  expect(await runtime.call('create_project', input)).toEqual(await first)
  expect(dependencies.execute).toHaveBeenCalledOnce()
})
it('keeps 64 completed results and the high-water after eviction, without executing an old request', async () => {
  const { runtime, dependencies } = setup()
  for (let requestId = 1; requestId <= 65; requestId++) expect(await runtime.call('create_project', { sessionId, requestId, name: 'N' })).toMatchObject({ ok: true })
  expect(await runtime.call('create_project', { sessionId, requestId: 1, name: 'N' })).toMatchObject({ error: { code: 'conflict' } })
  expect(await runtime.call('create_project', { sessionId, requestId: 2, name: 'N' })).toMatchObject({ ok: true })
  expect(dependencies.execute).toHaveBeenCalledTimes(65)
  expect(await runtime.call('get_connection', {})).toMatchObject({ data: { lastMutationSequence: 65 } })
})
it('does not reserve a pre-dispatch refusal or execute after cleanup before the dispatch microtask', async () => {
  const guard = vi.fn<() => void>(() => { throw new ToolError('conflict') }), { runtime, dependencies } = setup({ guard })
  const input = { sessionId, requestId: 1, name: 'N' }
  expect(await runtime.call('create_project', input)).toMatchObject({ error: { code: 'conflict' } })
  guard.mockImplementation(() => {})
  const call = runtime.call('create_project', input); runtime.close()
  expect(await call).toMatchObject({ error: { code: 'disconnected' } })
  expect(dependencies.execute).not.toHaveBeenCalled()
})
it('bounds response waits, retains the real pending guard and caches late commit without replay', async () => {
  vi.useFakeTimers()
  try {
    const pending = deferred<unknown>(), { runtime, dependencies } = setup({ execute: vi.fn(() => pending.promise) }, 15_000)
    const input = { sessionId, requestId: 1, name: 'N' }, call = runtime.call('create_project', input)
    await vi.advanceTimersByTimeAsync(15_000)
    expect(await call).toMatchObject({ error: { code: 'outcome_unknown' } })
    expect(await runtime.call('create_project', { ...input, requestId: 2 })).toMatchObject({ error: { code: 'conflict' } })
    pending.resolve({ saved: true, project }); await vi.runAllTimersAsync()
    expect(await runtime.call('create_project', input)).toMatchObject({ ok: true, data: { saved: true } })
    expect(dependencies.execute).toHaveBeenCalledOnce()
  } finally { vi.useRealTimers() }
})
it('distinguishes cancellation before and after dispatch without claiming rollback', async () => {
  const pending = deferred<unknown>(), { runtime, dependencies } = setup({ execute: vi.fn(() => pending.promise) })
  const input = { sessionId, requestId: 1, name: 'N' }, before = new AbortController()
  before.abort()
  expect(await runtime.call('create_project', input, before.signal)).toMatchObject({ error: { code: 'disconnected' } })
  expect(dependencies.execute).not.toHaveBeenCalled()
  const after = new AbortController(), call = runtime.call('create_project', input, after.signal)
  await Promise.resolve(); after.abort()
  expect(await call).toMatchObject({ error: { code: 'outcome_unknown' } })
  pending.resolve({ saved: true, project })
  expect(await runtime.call('create_project', input)).toMatchObject({ ok: true })
  expect(dependencies.execute).toHaveBeenCalledOnce()
})
it('revokes a deferred registration attempt and prevents late tools from the old lifetime', async () => {
  const pending = deferred<void>(), tools = new Map<string, NativeTool>()
  const context = { registerTool: vi.fn(async (tool: NativeTool, { signal }: { signal: AbortSignal }) => {
    await pending.promise
    if (signal.aborted) return
    tools.set(tool.name, tool); signal.addEventListener('abort', () => tools.delete(tool.name))
  }) }
  const first = setup(), attempt = registerPageTools(context, first.runtime)
  attempt.stop(); pending.resolve(); await attempt.ready
  expect(tools.size).toBe(0)
  expect(context.registerTool).toHaveBeenCalledOnce()
  const next = setup(), current = registerPageTools(context, next.runtime); await current.ready
  expect(tools.size).toBe(14)
  const deletion = tools.get('delete_card')!
  expect(deletion.annotations.consequentialHint).toBe(true)
  expect(tools.get('list_projects')!.annotations.readOnlyHint).toBe(true)
  expect(tools.get('get_connection')!.inputSchema).not.toHaveProperty('exposedTo')
  current.stop(); expect(tools.size).toBe(0)
})
