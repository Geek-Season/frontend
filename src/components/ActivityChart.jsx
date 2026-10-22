import { useState } from 'react'

// Столбики «сколько ответов в день» за последние 14 дней.
// При наведении (или нажатии на телефоне) показывается подсказка с числами.
export default function ActivityChart({ days }) {
  const [active, setActive] = useState(null)
  const max = Math.max(1, ...days.map((d) => d.attempts))
  const shown = active === null ? null : days[active]

  return (
    <div className="activity">
      <div className="activity__tooltip" aria-live="polite">
        {shown ? (
          <>
            <strong>{formatDay(shown.date, { weekday: 'short', day: 'numeric', month: 'long' })}</strong>
            {' · '}
            {shown.attempts === 0
              ? 'ответов не было'
              : `ответов: ${shown.attempts}, верных: ${shown.correct}`}
          </>
        ) : (
          <span className="muted">Наведите или нажмите на столбик, чтобы увидеть день</span>
        )}
      </div>

      <div className="activity__plot" style={{ '--max': max }}>
        <span className="activity__max">{max}</span>
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            className={`activity__col ${i === active ? 'is-active' : ''}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(i)}
            aria-label={`${formatDay(d.date, { day: 'numeric', month: 'long' })}: ответов ${d.attempts}, верных ${d.correct}`}
          >
            <span
              className={`activity__bar ${d.attempts === 0 ? 'is-empty' : ''}`}
              style={{ height: `${(d.attempts / max) * 100}%` }}
            />
            <span className="activity__label">{formatDay(d.date, { day: 'numeric' })}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Дата приходит строкой "2026-10-22" — разбираем вручную, чтобы не съехал часовой пояс.
function formatDay(isoDate, options) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', options)
}
