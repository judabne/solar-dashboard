/** MUST / SolarMust portal (solarmust.shinemonitor.com) embeds this key in its public login scripts. */
export const SHINEMONITOR_MUST_DEFAULT_COMPANY_KEY = 'bnrl_frRFjEz8Mkn'

export const SHINEMONITOR_MUST_DEFAULT_APP_ID = 'solarmust.shinemonitor.com'

function normalizeBaseUrl(url: string): string {
  let normalized = url.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`
  }
  normalized = normalized.replace(/^http:\/\//i, 'https://')
  if (!normalized.endsWith('/')) {
    normalized += '/'
  }
  return normalized
}

const SHINEMONITOR_WEB_PUBLIC_URL = 'https://web.shinemonitor.com/public/'

function resolveBusinessUseAppParams(
  baseUrl: string,
  explicit: string | undefined
): boolean {
  if (explicit === 'true' || explicit === '1') {
    return true
  }
  if (explicit === 'false' || explicit === '0') {
    return false
  }
  return !baseUrl.includes('web.shinemonitor.com')
}

export function resolveShineMonitorConfig() {
  const config = useRuntimeConfig()
  const baseUrl = normalizeBaseUrl(config.shinemonitorBaseUrl || SHINEMONITOR_WEB_PUBLIC_URL)
  const lang = config.shinemonitorLang || config.shinemonitorI18n || 'en_US'
  return {
    baseUrl,
    companyKey: config.shinemonitorCompanyKey || SHINEMONITOR_MUST_DEFAULT_COMPANY_KEY,
    source: config.shinemonitorSource || '1',
    appId: config.shinemonitorAppId || SHINEMONITOR_MUST_DEFAULT_APP_ID,
    appVersion: config.shinemonitorAppVersion || '1.0.0',
    appClient: config.shinemonitorAppClient || 'web',
    i18n: config.shinemonitorI18n || 'en_US',
    lang,
    businessUseAppParams: resolveBusinessUseAppParams(
      baseUrl,
      config.shinemonitorBusinessUseAppParams
    )
  }
}
