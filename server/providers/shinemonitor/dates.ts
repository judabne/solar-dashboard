/** Calendar date in the server local timezone (matches device-day queries for most users). */
export function formatLocalDateYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function eachLocalDayInRange(rangeStart: Date, rangeEnd: Date): string[] {
  const days: string[] = []
  const cursor = new Date(rangeStart)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(rangeEnd)
  end.setHours(23, 59, 59, 999)

  while (cursor.getTime() <= end.getTime()) {
    days.push(formatLocalDateYmd(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}
