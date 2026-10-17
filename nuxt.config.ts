// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vite-pwa/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    credentialEncryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY || '',
    deviceHashSecret: process.env.DEVICE_HASH_SECRET || '',
    shinemonitorBaseUrl: process.env.SHINEMONITOR_BASE_URL || 'https://web.shinemonitor.com/public/',
    shinemonitorCompanyKey: process.env.SHINEMONITOR_COMPANY_KEY || '',
    shinemonitorSource: process.env.SHINEMONITOR_SOURCE || '1',
    shinemonitorAppId: process.env.SHINEMONITOR_APP_ID || '',
    shinemonitorAppVersion: process.env.SHINEMONITOR_APP_VERSION || '1.0.0',
    shinemonitorAppClient: process.env.SHINEMONITOR_APP_CLIENT || 'web',
    shinemonitorI18n: process.env.SHINEMONITOR_I18N || 'en_US',
    shinemonitorLang: process.env.SHINEMONITOR_LANG || '',
    shinemonitorBusinessUseAppParams: process.env.SHINEMONITOR_BUSINESS_USE_APP_PARAMS || ''
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    routeRules: {
      '/api/**': {
        cors: false,
        headers: { 'Cache-Control': 'private, no-store' }
      }
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Solar Dashboard',
      short_name: 'Solar',
      description: 'Home solar monitoring dashboard',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      start_url: '/',
      icons: [
        {
          src: '/favicon.ico',
          sizes: '48x48',
          type: 'image/x-icon',
          purpose: 'any'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: []
    },
    client: {
      installPrompt: true
    }
  }
})
