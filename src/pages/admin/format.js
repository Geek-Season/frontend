// Даты в админке.

const pad = (n) => String(n).padStart(2, '0')

/** 29.10.2026 */
export function day(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** 31.10 23:05 (в этом году) или 31.10.2025 23:05 */
export function moment(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.getFullYear() === new Date().getFullYear()
    ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`
    : day(iso)
  return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** «Был»: сегодня, вчера, иначе дата. */
export function lastSeen(iso) {
  if (!iso) return 'не входил'
  const d = new Date(iso)
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (d >= start) return 'сегодня'
  if (d >= new Date(start.getTime() - 86400000)) return 'вчера'
  return day(iso)
}

/** Для <input type="date">: 2026-10-29 (по местному времени). */
export function dateInput(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа',
  'сентября', 'октября', 'ноября', 'декабря']

/** Как дату увидит ученик в профиле: «Занимаюсь с января 2026». */
export function since(value) {
  const d = new Date(value)
  return `Занимаюсь с ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
