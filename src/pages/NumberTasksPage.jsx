import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { getNumberTasks, getNumbers } from '../api.js'
import { useAuth } from '../auth.jsx'
import TaskCard from '../components/TaskCard.jsx'

const PAGE_SIZE = 20

const SOURCES = [
  { value: '', label: 'Все' },
  { value: 'demo', label: 'Демо' },
  { value: 'official', label: 'Официальные' },
  { value: 'author', label: 'Авторские' },
]

const PROGRESS = [
  { value: '', label: 'Все' },
  { value: 'unsolved', label: 'Нерешённые' },
  { value: 'solved', label: 'Решённые' },
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
  const { user } = useAuth()
  const [source, setSource] = useState('')
  const [sort, setSort] = useState('new')
  // Фильтр по прогрессу — только для вошедших. Можно открыть страницу сразу
  // с фильтром: /tasks/16?progress=unsolved (так делает «Потренировать» в профиле).
  const [searchParams] = useSearchParams()
  const [progress, setProgress] = useState(() =>
    ['solved', 'unsolved'].includes(searchParams.get('progress')) ? searchParams.get('progress') : '',
  )
  // Вышел из аккаунта — фильтр по прогрессу больше не применим.
  const progressFilter = user ? progress : ''

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
    getNumberTasks(code, { source, progress: progressFilter, sort, limit: PAGE_SIZE })
      .then((data) => !cancelled && setPage(data))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [code, source, progressFilter, sort, user])

  // Ученик решил задачу впервые — обновляем счётчик «Решено» без перезагрузки.
  function handleChecked(taskId, isCorrect) {
    setPage((current) => {
      const task = current.items.find((t) => t.id === taskId)
      const firstSolve = isCorrect && task.status !== 'solved'
      return {
        ...current,
        number: firstSolve ? { ...current.number, solved: current.number.solved + 1 } : current.number,
        items: current.items.map((t) =>
          t.id === taskId ? { ...t, status: isCorrect || t.status === 'solved' ? 'solved' : 'failed' } : t,
        ),
      }
    })
  }

  function loadMore() {
    setLoadingMore(true)
    getNumberTasks(code, { source, progress: progressFilter, sort, limit: PAGE_SIZE, offset: page.items.length })
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
          {page && (
            <p className="muted">
              {page.number.title}
              {user && ` · решено ${page.number.solved} из ${page.number.tasks_count}`}
            </p>
          )}
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
        {user && (
          <div className="segmented">
            {PROGRESS.map((p) => (
              <button
                key={p.value}
                className={progressFilter === p.value ? 'active' : ''}
                onClick={() => setProgress(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="select">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {!user && (
        <div className="notice">
          <Link to="/login">Войдите</Link>, чтобы ответы сохранялись в статистику.
        </div>
      )}

      {loading && <p className="muted">Загрузка…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && page && (
        <>
          <p className="muted small">Найдено задач: {page.total}</p>
          {page.items.length === 0 && (
            <div className="empty">{emptyText(progressFilter, source)}</div>
          )}
          {page.items.map((task, i) => (
            <TaskCard key={task.id} task={task} position={i + 1} onChecked={handleChecked} />
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

function emptyText(progress, source) {
  if (progress === 'unsolved') {
    return source ? 'Нерешённых задач с таким источником нет.' : 'Все задачи решены — отличная работа! 🎉'
  }
  if (progress === 'solved') return 'Здесь пока нет решённых задач.'
  return `В этом номере пока нет задач${source ? ' с таким источником' : ''}.`
}
