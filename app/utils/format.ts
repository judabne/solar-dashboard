export function formatKilowattHours(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'Unknown'
  }
  const rounded = Math.round(value * 10) / 10
  return `${rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh`
}

export function formatWatts(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—'
  }
  return `${Math.round(value).toLocaleString()} W`
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'Soon'
  }
  return `${Math.round(value)}%`
}

export function formatReadingTimestamp(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }
  const date = new Date(iso)
  const datePart = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  }).format(date)
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date)
  return `${datePart} - ${timePart}`
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
