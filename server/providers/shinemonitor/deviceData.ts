import type { ShineMonitorDataResponse } from './types'

function isNotFoundDevice(desc: string | undefined): boolean {
  return (desc || '').includes('NOT_FOUND_DEVICE')
}

export function deviceDataReachable(body: ShineMonitorDataResponse): boolean {
  if (body.err === 0) {
    return true
  }
  const desc = body.desc || ''
  if (isNotFoundDevice(desc)) {
    return false
  }
  if (desc.includes('NO_RECORD') || desc.includes('ERR_NO_RECORD')) {
    return true
  }
  return false
}
