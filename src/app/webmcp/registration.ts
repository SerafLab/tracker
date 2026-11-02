import { z } from 'zod'
import { descriptions, inputSchemas, readTools, type ToolName } from './schemas'
import type { ToolRuntime } from './runtime'

export type NativeTool = {
  name: ToolName
  description: string
  inputSchema: object
  annotations: { readOnlyHint: boolean; consequentialHint: boolean; untrustedContentHint: boolean }
  execute(input: unknown, context?: { signal?: AbortSignal }): Promise<unknown>
}
export type NativeModelContext = { registerTool(tool: NativeTool, options: { signal: AbortSignal }): void | Promise<void> }
export function nativeContext(document: Document): NativeModelContext | undefined {
  const context = (document as Document & { modelContext?: NativeModelContext }).modelContext
  return typeof context?.registerTool === 'function' ? context : undefined
}

/** Each attempt owns its runtime and signal. Revocation never promises rollback of an in-flight write. */
export function registerPageTools(context: NativeModelContext, runtime: ToolRuntime) {
  const attempt = new AbortController()
  let active = true
  const stop = () => { active = false; runtime.close(); attempt.abort() }
  const ready = (async () => {
    try {
      for (const name of Object.keys(inputSchemas) as ToolName[]) {
        if (!active) return
        await context.registerTool({
          name, description: descriptions[name],
          inputSchema: z.toJSONSchema(inputSchemas[name], { io: 'input', target: 'draft-07' }),
          annotations: { readOnlyHint: readTools.has(name), consequentialHint: name === 'delete_card' || name === 'delete_status', untrustedContentHint: name !== 'get_connection' && name !== 'show_workspace' },
          execute: (input, execution) => runtime.call(name, input, execution?.signal),
        }, { signal: attempt.signal })
        if (!active) { attempt.abort(); return }
      }
    } catch { stop() }
  })()
  return { stop, ready }
}
