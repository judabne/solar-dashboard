import type { MainTabId } from '~/utils/mainTab'
import { mainTabIndex } from '~/utils/mainTab'

const activeTab = ref<MainTabId>('overview')

/** Resets tab state between tests. */
export function resetMainTabForTests() {
  activeTab.value = 'overview'
}

export function useMainTab() {
  const activeIndex = computed(() => mainTabIndex(activeTab.value))

  function setActiveTab(tab: MainTabId) {
    activeTab.value = tab
  }

  return {
    activeTab: readonly(activeTab),
    activeIndex,
    setActiveTab
  }
}
