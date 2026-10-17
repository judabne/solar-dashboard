import { vi } from 'vitest'

class TouchPolyfill implements Touch {
  readonly identifier: number
  readonly target: EventTarget
  readonly clientX: number
  readonly clientY: number
  readonly screenX: number
  readonly screenY: number
  readonly pageX: number
  readonly pageY: number
  readonly radiusX = 0
  readonly radiusY = 0
  readonly rotationAngle = 0
  readonly force = 1

  constructor(init: {
    identifier: number
    target: EventTarget
    clientX: number
    clientY: number
  }) {
    this.identifier = init.identifier
    this.target = init.target
    this.clientX = init.clientX
    this.clientY = init.clientY
    this.screenX = init.clientX
    this.screenY = init.clientY
    this.pageX = init.clientX
    this.pageY = init.clientY
  }
}

function ensureTouchApi() {
  if (typeof globalThis.Touch === 'undefined') {
    globalThis.Touch = TouchPolyfill as typeof Touch
  }
}

ensureTouchApi()

export function dispatchTouchSequence(
  target: Element,
  points: { x: number, y: number }[],
  options?: { preventDefaultCheck?: (event: TouchEvent) => void }
) {
  ensureTouchApi()

  if (points.length === 0) {
    throw new Error('dispatchTouchSequence requires at least one point')
  }

  const makeTouch = (x: number, y: number) =>
    new TouchPolyfill({ identifier: 1, target, clientX: x, clientY: y })

  const start = points[0]!
  target.dispatchEvent(new TouchEvent('touchstart', {
    bubbles: true,
    cancelable: true,
    touches: [makeTouch(start.x, start.y)],
    changedTouches: [makeTouch(start.x, start.y)],
    targetTouches: [makeTouch(start.x, start.y)]
  }))

  for (let i = 1; i < points.length; i++) {
    const point = points[i]!
    const touch = makeTouch(point.x, point.y)
    const move = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [touch],
      changedTouches: [touch],
      targetTouches: [touch]
    })
    options?.preventDefaultCheck?.(move)
    target.dispatchEvent(move)
  }

  const end = points[points.length - 1]!
  const endTouch = makeTouch(end.x, end.y)
  target.dispatchEvent(new TouchEvent('touchend', {
    bubbles: true,
    cancelable: true,
    touches: [],
    changedTouches: [endTouch],
    targetTouches: []
  }))
}

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}))
