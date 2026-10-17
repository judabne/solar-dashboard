import { isClient } from '~/utils/clientOnly'

type ScrollPaneOverflowOptions = {
  /** Block upward pans when the pane has no overflow (overview). */
  clampTouchWhenShort?: boolean
}

/** Only allow vertical scroll when content actually overflows the pane. */
export function useScrollPaneOverflow(
  root: Ref<HTMLElement | null | undefined>,
  options: ScrollPaneOverflowOptions = {}
) {
  const scrollable = ref(false)
  let touchStartY = 0

  function sync() {
    const el = root.value
    if (!el) {
      scrollable.value = false
      return
    }
    const client = el.clientHeight
    if (client <= 0) {
      scheduleSync()
      return
    }
    scrollable.value = el.scrollHeight > client + 1
    if (!scrollable.value) {
      el.scrollTop = 0
    }
  }

  function scheduleSync() {
    if (!isClient()) {
      return
    }
    requestAnimationFrame(() => {
      sync()
      requestAnimationFrame(sync)
    })
  }

  function onTouchStart(event: TouchEvent) {
    touchStartY = event.touches[0]?.clientY ?? 0
  }

  function onTouchMove(event: TouchEvent) {
    if (!options.clampTouchWhenShort || scrollable.value) {
      return
    }
    const y = event.touches[0]?.clientY ?? 0
    if (y < touchStartY - 4) {
      event.preventDefault()
    }
  }

  watch(
    () => root.value,
    (el, _, onCleanup) => {
      if (!isClient() || !el) {
        scrollable.value = false
        return
      }

      sync()
      scheduleSync()

      const ro = new ResizeObserver(() => sync())
      ro.observe(el)
      const inner = el.firstElementChild
      if (inner) {
        ro.observe(inner)
      }

      const mo = new MutationObserver(() => sync())
      mo.observe(el, { childList: true, subtree: true, attributes: true })

      const onWindowResize = () => sync()
      window.addEventListener('resize', onWindowResize)
      window.visualViewport?.addEventListener('resize', onWindowResize)

      void document.fonts?.ready.then(() => sync())

      if (options.clampTouchWhenShort) {
        el.addEventListener('touchstart', onTouchStart, { passive: true })
        el.addEventListener('touchmove', onTouchMove, { passive: false })
      }

      onCleanup(() => {
        ro.disconnect()
        mo.disconnect()
        window.removeEventListener('resize', onWindowResize)
        window.visualViewport?.removeEventListener('resize', onWindowResize)
        if (options.clampTouchWhenShort) {
          el.removeEventListener('touchstart', onTouchStart)
          el.removeEventListener('touchmove', onTouchMove)
        }
      })
    },
    { immediate: true }
  )

  return scrollable
}
