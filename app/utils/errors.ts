const INFRA_PATTERNS = [
  /database is not configured/i,
  /credential encryption is not configured/i,
  /service unavailable/i,
  /not connected/i,
  /not verified/i,
  /dgrid\.top/i,
  /LOGON/i,
  /third-party/i,
  /public API/i,
  /^\[(?:GET|POST|PUT|DELETE|PATCH)\]/i
]

function extractStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const e = error as { statusCode?: number, status?: number, response?: { status?: number } }
    return e.statusCode ?? e.status ?? e.response?.status
  }
  return undefined
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/** User-facing alert text, or null when the error should not be shown. */
export function toDisplayMessage(error: unknown): string | null {
  const status = extractStatus(error)
  if (status === 503 || status === 502) {
    return null
  }

  if (status === 400 || status === 401) {
    return null
  }

  const message = extractMessage(error)
  if (!message) {
    return null
  }

  if (INFRA_PATTERNS.some(pattern => pattern.test(message))) {
    return null
  }

  if (message === 'Device not paired' || message === 'Invalid device credentials') {
    return null
  }

  return message
}
