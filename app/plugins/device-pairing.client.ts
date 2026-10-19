export default defineNuxtPlugin(() => {
  const { ensurePaired } = useDeviceAuth()
  void ensurePaired()
})
