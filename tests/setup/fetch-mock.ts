import { ref } from 'vue'
import { vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { HistoryResponse, NormalizedReadings } from '#shared/types/readings'

const latestFixture: NormalizedReadings = {
  solarGenerationW: 1200,
  gridPowerW: -50,
  homeConsumptionW: 400,
  batteryPercent: null,
  batteryStatus: 'unknown',
  inverterUpdatedAt: '2026-10-17T20:00:00.000Z',
  batteryUpdatedAt: null
}

const historyFixture: HistoryResponse = {
  rangeStart: '2026-10-16T00:00:00.000Z',
  rangeEnd: '2026-10-17T20:00:00.000Z',
  series: [
    {
      metric: 'solarGenerationW',
      points: [{ timestamp: '2026-10-17T12:00:00.000Z', value: 500 }]
    },
    {
      metric: 'gridPowerW',
      points: [{ timestamp: '2026-10-17T12:00:00.000Z', value: 0 }]
    },
    {
      metric: 'homeConsumptionW',
      points: [{ timestamp: '2026-10-17T12:00:00.000Z', value: 300 }]
    }
  ]
}

const fetchMock = vi.hoisted(() => vi.fn())

function installFetchMock() {
  fetchMock.mockImplementation(async (request: unknown) => {
    const url = String(request)
    if (url.includes('/api/device/pair')) {
      return { ok: true, data: { deviceId: 'test-device', registered: true } }
    }
    if (url.includes('/api/readings/latest')) {
      return { ok: true, data: latestFixture }
    }
    if (url.includes('/api/readings/history')) {
      return { ok: true, data: historyFixture }
    }
    if (url.includes('/api/providers/status')) {
      return {
        ok: true,
        data: {
          shinemonitor: {
            connected: false,
            needsReconnect: false,
            username: null,
            available: true,
            message: null
          },
          batali: {
            connected: false,
            needsReconnect: false,
            username: null,
            available: true,
            message: null
          }
        }
      }
    }
    throw new Error(`Unmocked $fetch: ${url}`)
  })
  vi.stubGlobal('$fetch', fetchMock)
  globalThis.__solarFetchMock = fetchMock
}

mockNuxtImport('useDeviceAuth', () => {
  return () => ({
    deviceId: ref('test-device'),
    deviceSecret: ref('test-secret'),
    pairingReady: ref(true),
    ensurePaired: async () => {},
    getAuthHeaders: () => ({
      'X-Device-Id': 'test-device',
      'X-Device-Secret': 'test-secret'
    }),
    clearLocalDevice: () => {}
  })
})

installFetchMock()
