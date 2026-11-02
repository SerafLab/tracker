import type { ErrorCode } from './schemas'
export class ToolError extends Error {
  constructor(readonly code: ErrorCode, message: string = code) { super(message) }
}
