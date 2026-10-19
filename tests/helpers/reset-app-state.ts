import { resetChartsHistoryForTests } from '~/composables/useChartsHistory'
import { resetLatestReadingsForTests } from '~/composables/useLatestReadings'
import { resetMainTabForTests } from '~/composables/useMainTab'

export function resetAppStateForTests() {
  resetMainTabForTests()
  resetChartsHistoryForTests()
  resetLatestReadingsForTests()
}
