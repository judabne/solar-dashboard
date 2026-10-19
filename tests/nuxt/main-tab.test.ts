import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import {
  countHistoryFetches,
  countLatestFetches,
  getFetchMock
} from '../helpers/fetch-mock'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import {
  dragPagerWithMouse,
  mountHome,
  pullToRefreshOn,
  swipePagerToCharts
} from '../helpers/mount-home'
import { resetAppStateForTests } from '../helpers/reset-app-state'

describe('main tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFetchMock().mockClear()
    resetAppStateForTests()
  })

  describe('navigation', () => {
    it('opens Charts on first nav click', async () => {
      const wrapper = await mountHome()
      const historyBefore = countHistoryFetches()

      expect(wrapper.find('[data-testid="overview-tab"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="charts-tab"]').exists()).toBe(false)

      await wrapper.get('[data-testid="nav-tab-charts"]').trigger('click')
      await flushPromises()

      const chartsTab = wrapper.get('[data-testid="charts-tab"]')
      expect(chartsTab.attributes('inert')).toBeUndefined()
      expect(wrapper.find('[data-testid="charts-range"]').exists()).toBe(true)
      expect(countHistoryFetches()).toBeGreaterThan(historyBefore)
      wrapper.unmount()
    })

    it('exposes a settings link on Overview', async () => {
      const wrapper = await mountHome()
      const link = wrapper.get('[data-testid="overview-tab"] [data-testid="settings-link"]')
      expect(link.attributes('href')).toBe('/settings')
      wrapper.unmount()
    })

    it('renders the settings page at /settings', async () => {
      const wrapper = await mountSuspended(App, { route: '/settings' })
      await flushPromises()

      expect(wrapper.find('[data-testid="settings-page"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Connections')
      wrapper.unmount()
    })

    it('swipes from Overview to Charts', async () => {
      const wrapper = await mountHome()
      const pager = wrapper.get('[data-testid="main-tab-pager"]').element

      swipePagerToCharts(pager)
      await flushPromises()

      expect(wrapper.find('[data-testid="charts-range"]').exists()).toBe(true)
      const overviewPane = wrapper.find('[data-testid="overview-scroll-pane"]')
      expect(overviewPane.attributes('inert')).toBeDefined()
      wrapper.unmount()
    })

    it('does not change tabs when dragging with the mouse (desktop)', async () => {
      const wrapper = await mountHome()
      const pager = wrapper.get('[data-testid="main-tab-pager"]').element

      dragPagerWithMouse(pager)
      await flushPromises()

      expect(wrapper.get('[data-testid="charts-scroll-pane"]').attributes('inert')).toBeDefined()
      expect(wrapper.find('[data-testid="overview-scroll-pane"]').attributes('inert')).toBeUndefined()
      wrapper.unmount()
    })
  })

  describe('scroll panes', () => {
    it('applies overflow control classes on the overview scroll pane', async () => {
      const wrapper = await mountHome()
      await flushPromises()

      const pane = wrapper.get('[data-testid="overview-scroll-pane"]')
      const classes = pane.classes()
      expect(classes).toContain('overscroll-y-none')
      expect(classes).toContain('touch-pan-y')
      expect(classes.includes('overflow-y-hidden') || classes.includes('overflow-y-auto')).toBe(true)
      wrapper.unmount()
    })

    it('keeps charts scroll pane scrollable', async () => {
      const wrapper = await mountHome()
      await flushPromises()
      await wrapper.get('[data-testid="nav-tab-charts"]').trigger('click')
      await flushPromises()

      const chartsPane = wrapper.get('[data-testid="charts-scroll-pane"]')
      expect(chartsPane.classes()).toContain('overflow-y-auto')
      expect(chartsPane.classes()).toContain('min-h-0')
      wrapper.unmount()
    })

    it('resets overview scrollTop after pull when content does not overflow', async () => {
      const wrapper = await mountHome()
      await flushPromises()

      const scrollPane = wrapper.get('[data-testid="overview-scroll-pane"]')
      const el = scrollPane.element
      Object.defineProperty(el, 'clientHeight', { value: 600, configurable: true })
      Object.defineProperty(el, 'scrollHeight', { value: 400, configurable: true })
      Object.defineProperty(el, 'scrollTop', { value: 24, writable: true, configurable: true })

      pullToRefreshOn(el)
      await flushPromises()

      expect(el.scrollTop).toBe(0)
      wrapper.unmount()
    })
  })

  describe('refresh', () => {
    it('pull-to-refresh on Overview fetches latest only', async () => {
      const wrapper = await mountHome()
      await flushPromises()
      getFetchMock().mockClear()

      pullToRefreshOn(wrapper.get('[data-testid="overview-scroll-pane"]').element)
      await flushPromises()

      expect(countLatestFetches()).toBe(1)
      expect(countHistoryFetches()).toBe(0)
      wrapper.unmount()
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
      wrapper.unmount()
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
      wrapper.unmount()
    })
  })
})
