import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '../auth.jsx'
import { useMyHomework } from '../queries.js'
import { day } from './admin/format.js'

// /homework — домашки ученика: карточки с прогрессом. Сверху несданные, во вкладке «Сданные» — остальные.
export default function HomeworkListPage() {
  const { user, checking } = useAuth()
  const [view, setView] = useState('active')
  const query = useMyHomework()

  if (checking) return <p className="muted">Загрузка…</p>
  if (!user) return <Navigate to="/login" replace />

  const all = query.data ?? []
  const active = all.filter((h) => !h.submitted_at)
  const done = all.filter((h) => h.submitted_at)
  const shown = view === 'active' ? active : done

  return (
    <section className="hw-list">
      <div className="page-head">
        <h1>Домашки</h1>
        {query.data && <p className="muted">{active.length} надо сделать · {done.length} сдано</p>}
      </div>

      <div className="segmented hw-list__tabs" role="tablist">
        <button role="tab" aria-selected={view === 'active'} className={view === 'active' ? 'active' : ''} onClick={() => setView('active')}>
          Активные
        </button>
        <button role="tab" aria-selected={view === 'done'} className={view === 'done' ? 'active' : ''} onClick={() => setView('done')}>
          Сданные
        </button>
      </div>

      {query.error && <p className="error">{query.error.message}</p>}
      {query.isPending && <p className="muted">Загрузка…</p>}
      {query.data && shown.length === 0 && (
        <div className="empty">
          {view === 'active' ? 'Несданных домашек нет.' : 'Сданных домашек пока нет.'}
        </div>
      )}

      {shown.map((h) => <HomeworkCard key={h.id} homework={h} />)}
    </section>
  )
}

function HomeworkCard({ homework: h }) {
  const submitted = Boolean(h.submitted_at)
  const fresh = !submitted && h.answered === 0
  const share = h.total ? Math.round(((submitted ? h.correct : h.answered) / h.total) * 100) : 0

  return (
    <article className={`hw-card ${submitted ? 'hw-card--done' : ''}`}>
      <div className="hw-card__head">
        <Link to={`/homework/${h.id}`} className="hw-card__title">{h.title}</Link>
        {fresh && <span className="badge hw-badge--new">новая</span>}
        {submitted && <span className="badge badge--status-solved">сдана {day(h.submitted_at)}</span>}
      </div>
      <div className="hw-card__meta muted small">
        {h.numbers.map((code) => <span key={code} className="hw-chip">№{code}</span>)}
        <span>· {tasksWord(h.total)} · от {day(h.sent_at)}</span>
      </div>
      {h.comment && <p className="hw-card__comment muted small">«{h.comment}»</p>}
      <div className={`progress hw-card__bar ${submitted ? '' : 'hw-card__bar--todo'}`}>
        <span style={{ width: `${share}%` }} />
      </div>
      <div className="hw-card__foot">
        <span className="muted small">
          {submitted ? `верно ${h.correct} из ${h.total}` : `отвечено ${h.answered} из ${h.total}`}
        </span>
        <Link to={`/homework/${h.id}`} className={`btn btn--small ${submitted ? 'btn--ghost' : ''}`}>
          {submitted ? 'Открыть' : fresh ? 'Начать' : 'Продолжить'}
        </Link>
      </div>
    </article>
  )
}

/** «1 задача», «3 задачи», «8 задач» */
export function tasksWord(n) {
  const last = n % 10
  const teen = n % 100 >= 11 && n % 100 <= 14
  if (last === 1 && !teen) return `${n} задача`
  if (last >= 2 && last <= 4 && !teen) return `${n} задачи`
  return `${n} задач`
}
