import type { H3Event } from 'h3'
import type { ApiFailure, ApiResult, ApiSuccess } from '#shared/types/api'

export function apiOk<T>(data: T): ApiSuccess<T> {
  return { ok: true, data }
}

export function apiErr(code: string, message: string): ApiFailure {
  return { ok: false, error: { code, message } }
}

export function sendApiResult<T>(event: H3Event, result: ApiResult<T>) {
  if (!result.ok) {
    const code = result.error.code
    const status = code === 'UNAUTHORIZED'
      ? 401
      : code === 'PROVIDER_AUTH'
        ? 401
        : 400
    setResponseStatus(event, status)
  }
  return result
}
