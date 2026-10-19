const DEVICE_ID_KEY = 'solar_dashboard_device_id'
const DEVICE_SECRET_KEY = 'solar_dashboard_device_secret'

let pairingInFlight: Promise<void> | null = null

function randomSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export function useDeviceAuth() {
  const deviceId = useState<string | null>('device-id', () => null)
  const deviceSecret = useState<string | null>('device-secret', () => null)
  const pairingReady = useState('device-pairing-ready', () => false)

  async function ensurePaired() {
    if (!import.meta.client) {
      return
    }
    if (pairingReady.value) {
      return
    }
    if (pairingInFlight) {
      await pairingInFlight
      return
    }

    pairingInFlight = (async () => {
      let id = localStorage.getItem(DEVICE_ID_KEY)
      let secret = localStorage.getItem(DEVICE_SECRET_KEY)

      if (!id || !secret) {
        id = crypto.randomUUID()
        secret = randomSecret()
        localStorage.setItem(DEVICE_ID_KEY, id)
        localStorage.setItem(DEVICE_SECRET_KEY, secret)
      }

      deviceId.value = id
      deviceSecret.value = secret

      try {
        await $fetch('/api/device/pair', {
          method: 'POST',
          body: { deviceId: id, deviceSecret: secret }
        })
      } catch {
      // Local credentials are enough for the client; server registration needs DATABASE_URL.
      }

      pairingReady.value = true
    })()

    try {
      await pairingInFlight
    } finally {
      pairingInFlight = null
    }
  }

  function getAuthHeaders(): Record<string, string> {
    if (!deviceId.value || !deviceSecret.value) {
      return {}
    }
    return {
      'X-Device-Id': deviceId.value,
      'X-Device-Secret': deviceSecret.value
    }
  }

  function clearLocalDevice() {
    localStorage.removeItem(DEVICE_ID_KEY)
    localStorage.removeItem(DEVICE_SECRET_KEY)
    deviceId.value = null
    deviceSecret.value = null
    pairingReady.value = false
  }

  return {
    deviceId,
    deviceSecret,
    pairingReady,
    ensurePaired,
    getAuthHeaders,
    clearLocalDevice
  }
}
