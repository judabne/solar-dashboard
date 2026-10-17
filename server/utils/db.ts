import { neon } from '@neondatabase/serverless'

export function getSql() {
  const url = useRuntimeConfig().databaseUrl
  if (!url) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Database is not configured'
    })
  }
  return neon(url)
}
