import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import App from '~/app.vue'
import { dispatchTouchSequence } from '../setup/touch'

export async function mountHome(): Promise<VueWrapper> {
  const wrapper = await mountSuspended(App, { route: '/' })
  await flushPromises()
  await wrapper.get('[data-testid="nav-tab-overview"]').trigger('click')
  await flushPromises()
  return wrapper
}

export function pullToRefreshOn(element: Element) {
  Object.defineProperty(element, 'scrollTop', { value: 0, configurable: true })
  dispatchTouchSequence(element, [
    { x: 100, y: 40 },
    { x: 100, y: 140 },
    { x: 100, y: 220 }
  ])
}

export function swipePagerToCharts(pager: Element, width = 400) {
  Object.defineProperty(pager, 'clientWidth', { value: width, configurable: true })
  dispatchTouchSequence(pager, [
    { x: 200, y: 200 },
    { x: 120, y: 200 },
    { x: 60, y: 200 }
  ])
}

export function dragPagerWithMouse(pager: Element, width = 400) {
  Object.defineProperty(pager, 'clientWidth', { value: width, configurable: true })
  const start = { clientX: 200, clientY: 200 }
  pager.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, ...start }))
  pager.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: 60, clientY: 200 }))
  pager.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: 60, clientY: 200 }))
}
