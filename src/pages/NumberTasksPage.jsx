import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { useAuth } from '../auth.jsx'
import TaskCard from '../components/TaskCard.jsx'
import { tasksQueryOptions, useInvalidate, useMe, useNumberTasks, useNumbers } from '../queries.js'

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

  const me = useMe()
  const invalidate = useInvalidate()
  const filters = { source, progress: progressFilter, sort }

  // Задачи — из кэша, порциями по 20 («Показать ещё»). Номер, фильтр или сортировка
  // уже открывались недавно — список появится сразу, без запроса.
  const tasks = useNumberTasks(code, filters)
  const pages = tasks.data?.pages
  const page = pages && {
    number: pages[pages.length - 1].number,
    total: pages[pages.length - 1].total,
    items: pages.flatMap((p) => p.items),
  }
  const loading = tasks.isPending
  const error = tasks.error?.message

  // Коды номеров для стрелок «предыдущий / следующий» — тот же кэш, что у страницы «Задания»:
  // отдельного запроса больше нет.
  const allCodes = (useNumbers().data ?? []).map((n) => n.code)

  // Ученик ответил — обновляем метку задачи и «решено X из Y» на месте, без перезагрузки,
  // а профиль, рейтинг и другие фильтры помечаем устаревшими.
  function handleChecked(taskId, isCorrect) {
    invalidate.taskChecked(tasksQueryOptions(me, code, filters).queryKey, code, taskId, isCorrect)
  }

  const index = allCodes.indexOf(code)
  const prev = index > 0 ? allCodes[index - 1] : null
  const next = index >= 0 && index < allCodes.length - 1 ? allCodes[index + 1] : null

  return (
    <section>
      <div className="number-head">
        <Link to="/" className="back" aria-label="К списку номеров">←</Link>
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
      {error && !page && <p className="error">{error}</p>}

      {!loading && page && (
        <>
          <p className="muted small">Найдено задач: {page.total}</p>
          {page.items.length === 0 && (
            <div className="empty">{emptyText(progressFilter, source)}</div>
          )}
          {page.items.map((task, i) => (
            <TaskCard key={task.id} task={task} position={i + 1} onChecked={handleChecked} />
          ))}
          {tasks.hasNextPage && (
            <button className="btn btn--ghost wide" onClick={() => tasks.fetchNextPage()} disabled={tasks.isFetchingNextPage}>
              {tasks.isFetchingNextPage ? 'Загрузка…' : 'Показать ещё'}
            </button>
          )}
          {tasks.isFetchNextPageError && <p className="error">Не удалось загрузить ещё: {tasks.error?.message}</p>}
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
