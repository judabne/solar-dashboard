import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

const pwaRegisterStub = fileURLToPath(new URL('./tests/stubs/pwa-register-stub.ts', import.meta.url))

export default defineVitestConfig({
  resolve: {
    alias: {
      'virtual:pwa-register/vue': pwaRegisterStub
    }
  },
  test: {
    environment: 'nuxt',
    setupFiles: [
      './tests/setup/touch.ts',
      './tests/setup/stubs.ts',
      './tests/setup/fetch-mock.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['app/**/*.{ts,vue}', 'shared/**/*.ts'],
      exclude: [
        'app/**/*.client.vue',
        '**/node_modules/**'
      ]
    },
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
        overrides: {
          modules: ['@nuxt/eslint', '@nuxt/ui']
        }
      }
    }
  }
})
