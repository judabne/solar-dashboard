import type { ApiErrorBody, ApiResult } from '#shared/types/api'

export function parseApiResult<T>(payload: ApiResult<T>): T {
  if (!payload.ok) {
    throw payload.error
  }
  return payload.data
}

export function providerAuthMessage(code: string, message: string): string {
  const upper = message.toUpperCase()
  if (upper.includes('PASSWORD') || upper.includes('ERR_PASSWORD')) {
    return 'Incorrect username or password'
  }
  if (upper.includes('NOT_FOUND_USR') || upper.includes('NOT FOUND')) {
    return 'Account not found. Use the same username or email you use on the SolarMust website.'
  }
  if (upper.includes('DISABLED') || upper.includes('FROZEN')) {
    return 'This account is disabled'
  }
  if (upper.includes('NO SHINEMONITOR DEVICES') || upper.includes('NOT_FOUND_DEVICE')) {
    return 'No inverter found for this account'
  }
  if (upper.includes('COMPANY_KEY') || upper.includes('NOT_FOUND_COMPANY')) {
    return 'Server ShineMonitor setup is incomplete'
  }
  if (upper.includes('FETCH FAILED') || upper.includes('SHINEMONITOR REQUEST FAILED')) {
    return 'Could not reach ShineMonitor. Check your internet connection and try again.'
  }
  if (code === 'PROVIDER_AUTH' && message.length < 120 && !message.startsWith('[')) {
    return message
  }
  return 'Could not connect. Check your details and try again.'
}

export function isApiFailure(value: unknown): value is ApiErrorBody {
  return Boolean(
    value
    && typeof value === 'object'
    && 'code' in value
    && 'message' in value
  )
}
