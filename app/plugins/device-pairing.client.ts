export default defineNuxtPlugin(async () => {
  const { ensurePaired } = useDeviceAuth()
  await ensurePaired()
})
