export function useRegisterSW() {
  return {
    needRefresh: { value: false },
    offlineReady: { value: false },
    updateServiceWorker: () => Promise.resolve()
  }
}

export default function registerSW() {}
