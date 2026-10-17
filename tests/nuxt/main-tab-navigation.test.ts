import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import {
  countHistoryFetches,
  getFetchMock
} from '../helpers/fetch-mock'
import {
  dragPagerWithMouse,
  mountHome,
  swipePagerToCharts
} from '../helpers/mount-home'

describe('main tab navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFetchMock().mockClear()
  })

  it('opens Charts on first nav click', async () => {
    const wrapper = await mountHome()
    const historyBefore = countHistoryFetches()

    expect(wrapper.find('[data-testid="overview-tab"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="charts-tab"]').exists()).toBe(true)

    await wrapper.get('[data-testid="nav-tab-charts"]').trigger('click')
    await flushPromises()

    const chartsTab = wrapper.get('[data-testid="charts-tab"]')
    expect(chartsTab.attributes('inert')).toBeUndefined()
    expect(wrapper.find('[data-testid="charts-range"]').exists()).toBe(true)
    expect(countHistoryFetches()).toBeGreaterThan(historyBefore)
  })

  it('opens Settings on first settings click', async () => {
    const wrapper = await mountHome()
    const link = wrapper.get('[data-testid="overview-tab"] [data-testid="settings-link"]')
    expect(link.attributes('href')).toBe('/settings')

    const user = userEvent.setup()
    await user.click(link.element as HTMLElement)
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="settings-page"]').exists()).toBe(true)
    })
    expect(wrapper.text()).toContain('Connections')
  })

  it('swipes from Overview to Charts', async () => {
    const wrapper = await mountHome()
    const pager = wrapper.get('[data-testid="main-tab-pager"]').element

    swipePagerToCharts(pager)
    await flushPromises()

    expect(wrapper.find('[data-testid="charts-range"]').exists()).toBe(true)
    const overviewPane = wrapper.find('[data-testid="overview-scroll-pane"]')
    expect(overviewPane.attributes('inert')).toBeDefined()
  })

  it('does not change tabs when dragging with the mouse (desktop)', async () => {
    const wrapper = await mountHome()
    const pager = wrapper.get('[data-testid="main-tab-pager"]').element

    dragPagerWithMouse(pager)
    await flushPromises()

    expect(wrapper.get('[data-testid="charts-scroll-pane"]').attributes('inert')).toBeDefined()
    expect(wrapper.find('[data-testid="overview-scroll-pane"]').attributes('inert')).toBeUndefined()
  })
})
