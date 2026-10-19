import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import ChartsTab from '~/components/ChartsTab.vue'
import { chartsScrollPaneKey } from '~/composables/mainTabScroll'
import { useMainTab } from '~/composables/useMainTab'
import { countHistoryFetches, getFetchMock } from '../helpers/fetch-mock'
import { resetAppStateForTests } from '../helpers/reset-app-state'

describe('ChartsTab history loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getFetchMock().mockClear()
    resetAppStateForTests()
  })

  it('fetches history on mount when the charts tab is already active', async () => {
    useMainTab().setActiveTab('charts')

    const scrollPane = ref<HTMLElement | null>(null)
    const wrapper = await mountSuspended(ChartsTab, {
      global: {
        provide: {
          [chartsScrollPaneKey]: scrollPane
        }
      }
    })
    await flushPromises()

    expect(countHistoryFetches()).toBe(1)
    expect(wrapper.find('[data-testid="chart-stub"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('does not refetch when cached history matches the selected range', async () => {
    useMainTab().setActiveTab('charts')

    const scrollPane = ref<HTMLElement | null>(null)
    const wrapper = await mountSuspended(ChartsTab, {
      global: {
        provide: {
          [chartsScrollPaneKey]: scrollPane
        }
      }
    })
    await flushPromises()
    getFetchMock().mockClear()

    wrapper.unmount()

    useMainTab().setActiveTab('charts')
    const wrapperAgain = await mountSuspended(ChartsTab, {
      global: {
        provide: {
          [chartsScrollPaneKey]: scrollPane
        }
      }
    })
    await flushPromises()

    expect(countHistoryFetches()).toBe(0)
    wrapperAgain.unmount()
  })
})
