import { inspect } from 'util'

/**
 * An Error's stack followed by its `cause` chain. electron-log prints only the stack, but the cause
 * often holds the real reason: a DrizzleError's cause is SQLite's own message.
 */
export function formatError(error: Error): string {
  const text = error.stack ?? `${error.name}: ${error.message}`
  if (error.cause === undefined) return text
  const cause = error.cause instanceof Error ? formatError(error.cause) : describe(error.cause)
  return `${text}\nCaused by: ${cause}`
}

/** The messages of an Error and its causes, for showing to the user. */
export function errorMessages(error: unknown): string {
  const messages: string[] = []
  for (let current = error; current !== undefined;) {
    if (!(current instanceof Error)) {
      messages.push(describe(current))
      break
    }
    messages.push(current.message)
    current = current.cause
  }
  return messages.join('\n')
}

/** A thrown value that is not an Error: strings as they are, anything else inspected. */
function describe(value: unknown): string {
  return typeof value === 'string' ? value : inspect(value)
}
