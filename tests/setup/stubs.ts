import { defineComponent } from 'vue'
import { vi } from 'vitest'

vi.mock('~/components/TimeSeriesChart.client.vue', () => ({
  default: defineComponent({
    name: 'TimeSeriesChartStub',
    props: {
      title: { type: String, default: '' }
    },
    template: '<div data-testid="chart-stub">{{ title }}</div>'
  })
}))
