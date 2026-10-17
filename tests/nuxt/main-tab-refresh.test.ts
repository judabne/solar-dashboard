import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import {
  countHistoryFetches,
  countLatestFetches,
  getFetchMock
} from '../helpers/fetch-mock'
import { mountHome, pullToRefreshOn } from '../helpers/mount-home'

const OVERVIEW_REFRESH_MS = 2 * 60_000

describe('main tab refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFetchMock().mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('refetches latest readings on the overview timer', async () => {
    vi.useFakeTimers()
    const wrapper = await mountHome()
    await flushPromises()

    const afterMount = countLatestFetches()
    expect(afterMount).toBeGreaterThan(0)

    await vi.advanceTimersByTimeAsync(OVERVIEW_REFRESH_MS)
    await flushPromises()

    expect(countLatestFetches()).toBe(afterMount + 1)
    wrapper.unmount()
  })

  it('pull-to-refresh on Overview fetches latest only', async () => {
    const wrapper = await mountHome()
    await flushPromises()
    getFetchMock().mockClear()

    pullToRefreshOn(wrapper.get('[data-testid="overview-scroll-pane"]').element)
    await flushPromises()

    expect(countLatestFetches()).toBe(1)
    expect(countHistoryFetches()).toBe(0)
  })

  it('pull-to-refresh on Charts fetches history only', async () => {
    const wrapper = await mountHome()
    await wrapper.get('[data-testid="nav-tab-charts"]').trigger('click')
    await flushPromises()
    getFetchMock().mockClear()

    pullToRefreshOn(wrapper.get('[data-testid="charts-scroll-pane"]').element)
    await flushPromises()

    expect(countHistoryFetches()).toBe(1)
    expect(countLatestFetches()).toBe(0)
  })

  it('overview pull does not run while Charts tab is active', async () => {
    const wrapper = await mountHome()
    await wrapper.get('[data-testid="nav-tab-charts"]').trigger('click')
    await flushPromises()
    getFetchMock().mockClear()

    pullToRefreshOn(wrapper.get('[data-testid="overview-scroll-pane"]').element)
    await flushPromises()

    expect(countLatestFetches()).toBe(0)
    expect(countHistoryFetches()).toBe(0)
  })
})
