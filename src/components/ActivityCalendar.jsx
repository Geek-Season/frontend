import { useEffect, useMemo, useRef, useState } from 'react'

// Календарь активности за год, как в LeetCode и GitHub: столбик — неделя (пн…вс), квадратик — день,
// чем ярче — тем больше ответов. calendar — из API: {start, end, days: [{date, attempts, correct}], total, …}.
// compact — квадратики помельче (в карточке ученика); showStreak — текущая серия в шапке
// (в карточке она отдельной плиткой).

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function parse(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function key(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function level(n) {
  if (!n) return 0
  if (n < 3) return 1
  if (n < 6) return 2
  if (n < 10) return 3
  return 4
}

function plural(n, one, few, many) {
  const tail = n % 100
  if (tail >= 11 && tail <= 14) return many
  if (n % 10 === 1) return one
  if (n % 10 >= 2 && n % 10 <= 4) return few
  return many
}

function dayTitle(date) {
  return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
}

function describe(date, day) {
  if (!day) return `${dayTitle(date)}: ответов не было`
  return `${dayTitle(date)}: ${day.attempts} ${plural(day.attempts, 'ответ', 'ответа', 'ответов')}, верных ${day.correct}`
}

export default function ActivityCalendar({ calendar, compact = false, showStreak = true }) {
  const [active, setActive] = useState(null) // {date, day}
  const scroller = useRef(null)

  const weeks = useMemo(() => {
    const byDate = Object.fromEntries(calendar.days.map((d) => [d.date, d]))
    const start = parse(calendar.start)
    const end = parse(calendar.end)
    const cursor = new Date(start)
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)) // к понедельнику
    const result = []
    while (cursor <= end) {
      const week = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(cursor)
        week.push(date >= start && date <= end ? { date, day: byDate[key(date)] } : null)
        cursor.setDate(cursor.getDate() + 1)
      }
      result.push(week)
    }
    return result
  }, [calendar])

  // На узком экране сначала видна последняя (текущая) неделя — как в GitHub.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth
  }, [weeks])

  return (
    <div className={`heat ${compact ? 'heat--compact' : ''}`}>
      <div className="heat__head">
        <span><b>{calendar.total} {plural(calendar.total, 'ответ', 'ответа', 'ответов')}</b> за год</span>
        <span className="muted small">
          дней с занятиями: {calendar.active_days}
          {showStreak && ` · серия: ${calendar.streak} ${plural(calendar.streak, 'день', 'дня', 'дней')}`}
          {' · '}лучшая серия: {calendar.best_streak} {plural(calendar.best_streak, 'день', 'дня', 'дней')}
        </span>
      </div>
      <div className="heat__scroll" ref={scroller}>
        <div className="heat__grid" onMouseLeave={() => setActive(null)}>
          <div className="heat__days" aria-hidden="true">
            <span /><span>пн</span><span /><span>ср</span><span /><span>пт</span><span />
          </div>
          {weeks.map((week, i) => {
            const first = week.find(Boolean)
            const previous = i > 0 ? weeks[i - 1].find(Boolean) : null
            const month = first && previous && first.date.getMonth() !== previous.date.getMonth()
              ? MONTHS[first.date.getMonth()] : ''
            return (
              <div key={i} className="heat__week">
                <span className="heat__month">{month}</span>
                {week.map((cell, j) => (cell ? (
                  <button
                    key={j}
                    type="button"
                    className={`heat__cell l${level(cell.day?.attempts)} ${active?.date === cell.date ? 'is-active' : ''}`}
                    aria-label={describe(cell.date, cell.day)}
                    onMouseEnter={() => setActive(cell)}
                    onFocus={() => setActive(cell)}
                    onClick={() => setActive(cell)}
                  />
                ) : <i key={j} className="heat__cell is-empty" />))}
              </div>
            )
          })}
        </div>
      </div>
      <div className="heat__foot">
        <span className="small" aria-live="polite">
          {active ? (
            <>
              <b>{dayTitle(active.date)}</b>
              <span className="muted">
                {' · '}
                {active.day
                  ? `${active.day.attempts} ${plural(active.day.attempts, 'ответ', 'ответа', 'ответов')}, верных ${active.day.correct}`
                  : 'ответов не было'}
              </span>
            </>
          ) : <span className="muted">Наведите или нажмите на квадратик, чтобы увидеть день</span>}
        </span>
        <span className="heat__legend muted small" aria-hidden="true">
          Меньше <i className="heat__cell l0" /><i className="heat__cell l1" /><i className="heat__cell l2" />
          <i className="heat__cell l3" /><i className="heat__cell l4" /> Больше
        </span>
      </div>
    </div>
  )
}
