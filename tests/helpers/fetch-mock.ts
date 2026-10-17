import type { Mock } from 'vitest'

declare global {
  var __solarFetchMock: Mock | undefined
}

export function getFetchMock(): Mock {
  const mock = globalThis.__solarFetchMock
  if (!mock) {
    throw new Error('fetch mock not installed — is tests/setup/fetch-mock.ts in vitest setupFiles?')
  }
  return mock
}

export function countFetches(matcher: (url: string) => boolean) {
  return getFetchMock().mock.calls.filter(call => matcher(String(call[0]))).length
}

export function countLatestFetches() {
  return countFetches(url => url.includes('/api/readings/latest'))
}

export function countHistoryFetches() {
  return countFetches(url => url.includes('/api/readings/history'))
}
