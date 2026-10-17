import { resolveShineMonitorConfig } from './config'
import type { ShineMonitorBusinessRequestOptions } from './types'

const API_PUBLIC_URL = 'https://api.shinemonitor.com/public/'

export function shineMonitorBusinessVariants(): ShineMonitorBusinessRequestOptions[] {
  const { baseUrl } = resolveShineMonitorConfig()
  const urls = [baseUrl]
  if (!baseUrl.includes('api.shinemonitor.com')) {
    urls.push(API_PUBLIC_URL)
  }

  const variants: ShineMonitorBusinessRequestOptions[] = []
  for (const url of urls) {
    variants.push({ baseUrl: url, useAppParams: false })
    variants.push({ baseUrl: url, useAppParams: true })
  }
  return variants
}

export { API_PUBLIC_URL }
