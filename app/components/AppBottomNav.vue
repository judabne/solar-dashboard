<script setup lang="ts">
import type { MainTabId } from '~/utils/mainTab'

const route = useRoute()
const { activeTab, setActiveTab } = useMainTab()

const items: { label: string, id: MainTabId, icon: string }[] = [
  { label: 'Overview', id: 'overview', icon: 'i-lucide-layout-dashboard' },
  { label: 'Charts', id: 'charts', icon: 'i-lucide-line-chart' }
]

async function selectTab(tab: MainTabId) {
  if (route.path !== '/') {
    await navigateTo('/')
  }
  setActiveTab(tab)
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-default/95 backdrop-blur supports-[backdrop-filter]:bg-default/80"
    aria-label="Main"
    @touchstart.stop
    @touchend.stop
  >
    <div class="page-shell-nav grid grid-cols-2 gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <button
        v-for="item in items"
        :key="item.id"
        :data-testid="`nav-tab-${item.id}`"
        type="button"
        class="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
        :class="route.path === '/' && activeTab === item.id ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-elevated'"
        @click="selectTab(item.id)"
      >
        <UIcon
          :name="item.icon"
          class="size-5"
        />
        {{ item.label }}
      </button>
    </div>
  </nav>
</template>
