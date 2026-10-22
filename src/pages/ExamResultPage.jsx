import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { getExam } from '../api.js'
import { useAuth } from '../auth.jsx'

// /exam/12 — результат пробника и разбор каждой задачи.
export default function ExamResultPage() {
  const { id } = useParams()
  const { user, checking } = useAuth()
  const [exam, setExam] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    getExam(id).then(setExam).catch((e) => setError(e.message))
  }, [id, user])

  if (checking) return <p className="muted">Загрузка…</p>
  if (!user) return <Navigate to="/login" replace />
  if (error) return <p className="error">{error}</p>
  if (!exam) return <p className="muted">Загрузка…</p>
  if (!exam.finished_at) return <Navigate to="/exam" replace /> // ещё идёт

  const percent = Math.round((exam.primary_score / exam.max_score) * 100)
  const minutes = Math.max(1, Math.round((new Date(exam.finished_at) - new Date(exam.started_at)) / 60000))
  const correct = exam.items.filter((i) => i.is_correct).length

  return (
    <section>
      <div className="page-head">
        <h1>Результат пробника</h1>
        <p className="muted">
          {new Date(exam.started_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          {' · '}решали {minutes} мин
        </p>
      </div>

      <div className="tiles tiles--3">
        <div className="tile">
          <span className="tile__label">Первичный балл</span>
          <span className="tile__value">{exam.primary_score} <span className="tile__of">из {exam.max_score}</span></span>
          <span className="tile__hint">{percent}% от максимума</span>
        </div>
        <div className="tile">
          <span className="tile__label">Верных ответов</span>
          <span className="tile__value">{correct} <span className="tile__of">из {exam.items.length}</span></span>
          <span className="tile__hint">без ответа: {exam.items.filter((i) => !i.answer).length}</span>
        </div>
        <div className="tile tile--actions">
          <Link to="/exam" className="btn">Новый пробник</Link>
          <Link to="/profile" className="btn btn--ghost">Что повторить</Link>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">Разбор</h2>
        {exam.items.map((i) => (
          <details key={i.position} className={`review ${i.is_correct ? 'review--ok' : 'review--bad'}`}>
            <summary>
              <span className="review__mark">{i.is_correct ? '✓' : '✗'}</span>
              <span className="review__number">№ {i.exam_number}</span>
              <span className="review__title muted">{i.title}</span>
              <span className="review__answers">
                <code>{i.answer ?? '—'}</code>
                {!i.is_correct && <> → <code>{i.correct_answer}</code></>}
              </span>
              <span className="review__points muted small">{i.is_correct ? i.points : 0}/{i.points}</span>
            </summary>
            <p className="task__statement">{i.statement}</p>
            {i.explanation && <p className="verdict__explanation">{i.explanation}</p>}
            <Link to={`/tasks/${i.exam_number}`} className="small">Задачи номера {i.exam_number} →</Link>
          </details>
        ))}
      </div>
    </section>
  )
}
