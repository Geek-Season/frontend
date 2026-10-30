import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth.jsx'
import { useNumbers, usePrefetchNumberTasks } from '../queries.js'

// Страница «Задания»: сетка карточек с номерами ЕГЭ.
export default function NumbersPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  // Из кэша: при возврате на страницу карточки появляются сразу, без «Загрузка…».
  // Вошёл или вышел ученик — другой ключ кэша (у вошедшего в ответе есть solved).
  const { data: numbers = [], isPending: loading, error: queryError } = useNumbers()
  const error = queryError?.message
  // Наведение на карточку — задачи номера начинают грузиться заранее.
  const prefetch = usePrefetchNumberTasks()

  const q = query.trim().toLowerCase()
  const visible = numbers.filter(
    (n) => !q || n.code.includes(q) || n.title.toLowerCase().includes(q),
  )

  return (
    <section>
      <div className="page-head">
        <h1>Задания ЕГЭ по информатике</h1>
        <p className="muted">Выберите номер, чтобы открыть его прототипы.</p>
      </div>

      <input
        className="search"
        placeholder="Номер или тема, например «16» или «рекурсия»"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p className="muted">Загрузка…</p>}
      {error && numbers.length === 0 && <p className="error">Не удалось загрузить номера: {error}</p>}
      {!loading && !error && visible.length === 0 && (
        <p className="muted">Ничего не найдено.</p>
      )}

      <div className="numbers-grid">
        {visible.map((n) => (
          <Link
            key={n.code}
            to={`/tasks/${n.code}`}
            className="number-card"
            onMouseEnter={() => prefetch(n.code)}
            onFocus={() => prefetch(n.code)}
            onTouchStart={() => prefetch(n.code)}
          >
            <span className="number-card__code">{n.code}</span>
            <span className="number-card__title">{n.title}</span>
            <span className="progress" title={user ? `Решено ${n.solved} из ${n.tasks_count}` : undefined}>
              <span style={{ width: `${percent(n.solved, n.tasks_count)}%` }} />
            </span>
            <span className="number-card__count">
              {user ? `${n.solved} / ${n.tasks_count}` : taskWord(n.tasks_count)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0
}

function taskWord(count) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} задача`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} задачи`
  return `${count} задач`
}
