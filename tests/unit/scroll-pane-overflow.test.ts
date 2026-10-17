// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { useScrollPaneOverflow } from '~/composables/useScrollPaneOverflow'

const resizeCallbacks = new Set<() => void>()

const PaneHost = defineComponent({
  setup() {
    const root = ref<HTMLElement | null>(null)
    const scrollable = useScrollPaneOverflow(root)
    return { root, scrollable }
  },
  template: `
    <div ref="root" data-testid="pane">
      <div data-testid="inner" />
    </div>
    <span data-testid="scrollable">{{ scrollable }}</span>
  `
})

function setScrollMetrics(el: HTMLElement, clientHeight: number, scrollHeight: number) {
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    get: () => clientHeight
  })
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight
  })
}

function flushResizeObservers() {
  for (const cb of resizeCallbacks) {
    cb()
  }
}

describe('useScrollPaneOverflow', () => {
  beforeEach(() => {
    resizeCallbacks.clear()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeObserverCallback) {
          resizeCallbacks.add(() => cb([], this as ResizeObserver))
        }

        observe() {}

        disconnect() {}

        unobserve() {}
      }
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('reports not scrollable when content fits the pane', async () => {
    const wrapper = mount(PaneHost, { attachTo: document.body })
    await flushPromises()

    const pane = wrapper.get('[data-testid="pane"]').element as HTMLElement
    setScrollMetrics(pane, 100, 80)
    flushResizeObservers()
    await nextTick()

    expect(wrapper.get('[data-testid="scrollable"]').text()).toBe('false')
    wrapper.unmount()
  })

  it('reports scrollable when content is taller than the pane', async () => {
    const wrapper = mount(PaneHost, { attachTo: document.body })
    await flushPromises()

    const pane = wrapper.get('[data-testid="pane"]').element as HTMLElement
    setScrollMetrics(pane, 100, 200)
    flushResizeObservers()
    await nextTick()

    expect(wrapper.get('[data-testid="scrollable"]').text()).toBe('true')
    wrapper.unmount()
  })

  it('clears scrollTop when content no longer overflows', async () => {
    const wrapper = mount(PaneHost, { attachTo: document.body })
    await flushPromises()

    const pane = wrapper.get('[data-testid="pane"]').element as HTMLElement
    setScrollMetrics(pane, 100, 200)
    flushResizeObservers()
    await nextTick()

    pane.scrollTop = 40
    setScrollMetrics(pane, 100, 80)
    flushResizeObservers()
    await nextTick()

    expect(wrapper.get('[data-testid="scrollable"]').text()).toBe('false')
    expect(pane.scrollTop).toBe(0)
    wrapper.unmount()
  })
})
