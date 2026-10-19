import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import {
  restartLatestReadingsPolling,
  useLatestReadings
} from '~/composables/useLatestReadings'
import { countLatestFetches, getFetchMock } from '../helpers/fetch-mock'
import { resetAppStateForTests } from '../helpers/reset-app-state'

const POLL_MS = 2 * 60_000

const PollingHarness = defineComponent({
  template: '<div data-testid="polling-harness" />',
  setup() {
    useLatestReadings({ poll: true })
  }
})

describe('useLatestReadings polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    resetAppStateForTests()
    getFetchMock().mockClear()
  })

  afterEach(() => {
    resetAppStateForTests()
    vi.useRealTimers()
  })

  it('refetches latest readings on the overview timer', async () => {
    const wrapper = await mountSuspended(PollingHarness, { route: '/' })
    await flushPromises()
    restartLatestReadingsPolling()
    getFetchMock().mockClear()

    await vi.advanceTimersByTimeAsync(POLL_MS)
    await flushPromises()

    expect(countLatestFetches()).toBe(1)
    wrapper.unmount()
  })

  it('does not poll while the document is hidden', async () => {
    const wrapper = await mountSuspended(PollingHarness, { route: '/' })
    await flushPromises()
    restartLatestReadingsPolling()
    getFetchMock().mockClear()

    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    await vi.advanceTimersByTimeAsync(POLL_MS)
    await flushPromises()

    expect(countLatestFetches()).toBe(0)
    wrapper.unmount()
  })
})
