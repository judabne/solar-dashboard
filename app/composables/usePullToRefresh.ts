export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const pullDistance = ref(0)
  const pullActive = ref(false)

  const threshold = 64
  let startY = 0
  let tracking = false

  function atScrollTop() {
    return window.scrollY <= 0
  }

  function onTouchStart(event: TouchEvent) {
    if (!atScrollTop() || pullActive.value) {
      tracking = false
      return
    }
    startY = event.touches[0]?.clientY ?? 0
    tracking = true
  }

  function onTouchMove(event: TouchEvent) {
    if (!tracking || pullActive.value) {
      return
    }
    const y = event.touches[0]?.clientY ?? 0
    const delta = y - startY
    if (delta > 0 && atScrollTop()) {
      pullDistance.value = Math.min(delta * 0.45, threshold * 1.4)
      if (delta > 8) {
        event.preventDefault()
      }
    } else {
      pullDistance.value = 0
    }
  }

  async function onTouchEnd() {
    if (!tracking) {
      return
    }
    tracking = false

    if (pullDistance.value >= threshold && !pullActive.value) {
      pullActive.value = true
      try {
        await onRefresh()
      } finally {
        pullActive.value = false
      }
    }
    pullDistance.value = 0
  }

  onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
    document.addEventListener('touchcancel', onTouchEnd)
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
    document.removeEventListener('touchcancel', onTouchEnd)
  })

  const pullLabel = computed(() => {
    if (pullActive.value) {
      return 'Refreshing…'
    }
    if (pullDistance.value >= threshold) {
      return 'Release to refresh'
    }
    if (pullDistance.value > 0) {
      return 'Pull to refresh'
    }
    return ''
  })

  return {
    pullDistance,
    pullActive,
    pullLabel,
    threshold
  }
}
