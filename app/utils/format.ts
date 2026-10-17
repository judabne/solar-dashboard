export function formatWatts(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }
  return `${Math.round(value).toLocaleString()} W`
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'Coming soon'
  }
  return `${Math.round(value)}%`
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) {
    return 'Never'
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(iso))
}
