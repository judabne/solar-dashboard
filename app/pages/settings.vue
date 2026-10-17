<script setup lang="ts">
import type { ProvidersStatusResponse } from '#shared/types/api'

import { toDisplayMessage } from '~/utils/errors'

definePageMeta({ layout: 'default' })

const router = useRouter()
const api = useDashboardApi()

const status = ref<ProvidersStatusResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const shineForm = reactive({ username: '', password: '' })
const bataliForm = reactive({ username: '', password: '' })
const shineBusy = ref(false)
const bataliBusy = ref(false)
const shineError = ref<string | null>(null)
const bataliError = ref<string | null>(null)

function goBack() {
  if (import.meta.client && window.history.length > 1) {
    router.back()
    return
  }
  router.push('/')
}

async function loadStatus() {
  loading.value = true
  error.value = null
  try {
    status.value = await api.getProviderStatus()
  } catch (e) {
    error.value = toDisplayMessage(e)
  } finally {
    loading.value = false
  }
}

async function signInShine() {
  shineBusy.value = true
  shineError.value = null
  try {
    await api.connectShineMonitor(shineForm.username, shineForm.password)
    shineForm.password = ''
    await loadStatus()
  } catch (e) {
    shineError.value = toDisplayMessage(e)
  } finally {
    shineBusy.value = false
  }
}

async function logoutShine() {
  shineBusy.value = true
  shineError.value = null
  try {
    await api.disconnectShineMonitor()
    await loadStatus()
  } catch (e) {
    shineError.value = toDisplayMessage(e)
  } finally {
    shineBusy.value = false
  }
}

async function signInBatali() {
  bataliBusy.value = true
  bataliError.value = null
  try {
    await api.connectBatali(bataliForm.username, bataliForm.password)
    bataliForm.password = ''
    await loadStatus()
  } catch (e) {
    bataliError.value = toDisplayMessage(e)
  } finally {
    bataliBusy.value = false
  }
}

async function logoutBatali() {
  bataliBusy.value = true
  bataliError.value = null
  try {
    await api.disconnectBatali()
    await loadStatus()
  } catch (e) {
    bataliError.value = toDisplayMessage(e)
  } finally {
    bataliBusy.value = false
  }
}

onMounted(loadStatus)

const shineConnected = computed(() =>
  Boolean(status.value?.shinemonitor.connected && !status.value?.shinemonitor.needsReconnect)
)
const bataliConnected = computed(() => Boolean(status.value?.batali.connected))
</script>

<template>
  <div class="page-shell pt-3">
    <button
      type="button"
      class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
      @click="goBack"
    >
      <UIcon name="i-lucide-chevron-left" class="size-4" />
      Settings
    </button>

    <h1 class="text-xl font-semibold mb-4">
      Connections
    </h1>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      class="mb-4"
      :title="error"
    />

    <div class="grid gap-4 md:grid-cols-2 md:gap-5">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-medium">
              MUST / ShineMonitor
            </h2>
            <UBadge v-if="shineConnected" color="success" variant="subtle">
              Connected
            </UBadge>
            <UBadge v-else-if="status?.shinemonitor.needsReconnect" color="warning" variant="subtle">
              Reconnect required
            </UBadge>
          </div>
        </template>

        <div v-if="loading" class="space-y-2">
          <USkeleton class="h-8 w-full" />
          <USkeleton class="h-8 w-full" />
        </div>

        <div v-else-if="shineConnected" class="space-y-3">
          <p class="text-sm">
            Authenticated as <span class="font-medium">{{ status?.shinemonitor.username }}</span>
          </p>
          <UButton
            label="Logout"
            color="neutral"
            variant="outline"
            :loading="shineBusy"
            @click="logoutShine"
          />
        </div>

        <form v-else class="space-y-3" @submit.prevent="signInShine">
          <UInput
            v-model="shineForm.username"
            class="w-full"
            label="Username"
            autocomplete="username"
            required
          />
          <UInput
            v-model="shineForm.password"
            class="w-full"
            label="Password"
            type="password"
            autocomplete="current-password"
            required
          />
          <UButton type="submit" label="Sign in" :loading="shineBusy" block />
        </form>

        <UAlert
          v-if="shineError"
          class="mt-3"
          color="error"
          variant="subtle"
          :title="shineError"
        />
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-medium">
              Batali Battery
            </h2>
            <UBadge v-if="bataliConnected" color="success" variant="subtle">
              Connected
            </UBadge>
          </div>
        </template>

        <div v-if="bataliConnected" class="space-y-3">
          <p class="text-sm">
            Authenticated as <span class="font-medium">{{ status?.batali.username }}</span>
          </p>
          <UButton
            label="Logout"
            color="neutral"
            variant="outline"
            :loading="bataliBusy"
            @click="logoutBatali"
          />
        </div>

        <form v-else class="space-y-3" @submit.prevent="signInBatali">
          <UInput
            v-model="bataliForm.username"
            class="w-full"
            label="Username / email"
            autocomplete="username"
          />
          <UInput
            v-model="bataliForm.password"
            class="w-full"
            label="Password"
            type="password"
            autocomplete="current-password"
          />
          <UButton
            type="submit"
            label="Sign in"
            :loading="bataliBusy"
            :disabled="!status?.batali.available"
            block
          />
        </form>

        <UAlert
          v-if="bataliError"
          class="mt-3"
          color="error"
          variant="subtle"
          :title="bataliError"
        />
      </UCard>
    </div>
  </div>
</template>
