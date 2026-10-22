import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getNumberTasks, getNumbers } from '../api.js'
import TaskCard from '../components/TaskCard.jsx'

const PAGE_SIZE = 20

const SOURCES = [
  { value: '', label: 'Все' },
  { value: 'demo', label: 'Демо' },
  { value: 'official', label: 'Официальные' },
  { value: 'author', label: 'Авторские' },
]

const SORTS = [
  { value: 'new', label: 'Сначала новые' },
  { value: 'old', label: 'Сначала старые' },
  { value: 'easy', label: 'Сначала лёгкие' },
  { value: 'hard', label: 'Сначала сложные' },
]

// Страница прототипов одного номера: /tasks/17
export default function NumberTasksPage() {
  const { code } = useParams()
  const [source, setSource] = useState('')
  const [sort, setSort] = useState('new')

  const [page, setPage] = useState(null) // { number, total, items }
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [allCodes, setAllCodes] = useState([])

  // Список кодов нужен для стрелок «предыдущий / следующий номер».
  useEffect(() => {
    getNumbers()
      .then((numbers) => setAllCodes(numbers.map((n) => n.code)))
      .catch(() => {})
  }, [])

  // Перезагружаем задачи, когда меняется номер, источник или сортировка.
  useEffect(() => {
    let cancelled = false // защита от ответа на устаревший запрос
    setLoading(true)
    setError(null)
    getNumberTasks(code, { source, sort, limit: PAGE_SIZE })
      .then((data) => !cancelled && setPage(data))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [code, source, sort])

  function loadMore() {
    setLoadingMore(true)
    getNumberTasks(code, { source, sort, limit: PAGE_SIZE, offset: page.items.length })
      .then((data) => setPage({ ...page, items: [...page.items, ...data.items] }))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingMore(false))
  }

  const index = allCodes.indexOf(code)
  const prev = index > 0 ? allCodes[index - 1] : null
  const next = index >= 0 && index < allCodes.length - 1 ? allCodes[index + 1] : null

  return (
    <section>
      <div className="number-head">
        <Link to="/tasks" className="back" aria-label="К списку номеров">←</Link>
        <div className="number-head__title">
          <h1>№ {code}</h1>
          {page && <p className="muted">{page.number.title}</p>}
        </div>
        <div className="number-head__nav">
          {prev ? <Link to={`/tasks/${prev}`} className="chip">‹ {prev}</Link> : null}
          {next ? <Link to={`/tasks/${next}`} className="chip">{next} ›</Link> : null}
        </div>
      </div>

      <div className="toolbar">
        <div className="segmented">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              className={source === s.value ? 'active' : ''}
              onClick={() => setSource(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="select">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading && <p className="muted">Загрузка…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && page && (
        <>
          <p className="muted small">Найдено задач: {page.total}</p>
          {page.items.length === 0 && (
            <div className="empty">
              В этом номере пока нет задач{source ? ' с таким источником' : ''}.
            </div>
          )}
          {page.items.map((task, i) => (
            <TaskCard key={task.id} task={task} position={i + 1} />
          ))}
          {page.items.length < page.total && (
            <button className="btn btn--ghost wide" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Загрузка…' : 'Показать ещё'}
            </button>
          )}
        </>
      )}
    </section>
  )
}
