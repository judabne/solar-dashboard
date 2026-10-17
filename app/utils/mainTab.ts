export const MAIN_TAB_IDS = ['overview', 'charts'] as const

export type MainTabId = (typeof MAIN_TAB_IDS)[number]

export function mainTabIndex(tab: MainTabId): number {
  return MAIN_TAB_IDS.indexOf(tab)
}
