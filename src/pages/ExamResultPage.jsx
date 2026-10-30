import { Link, Navigate, useParams } from 'react-router-dom'

import { useAuth } from '../auth.jsx'
import TaskMedia from '../components/TaskMedia.jsx'
import { useExam } from '../queries.js'

// /exam/12 — результат пробника и разбор каждой задачи.
export default function ExamResultPage() {
  const { id } = useParams()
  const { user, checking } = useAuth()
  // Завершённый пробник не меняется — после первого открытия разбор показывается из кэша.
  // Сразу после «Завершить» результат уже в кэше: страница открывается без запроса.
  const examQuery = useExam(id)
  const exam = examQuery.data ?? null
  const error = examQuery.error?.message

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

      <div className="tiles tiles--4">
        <div className={`tile tile--score ${exam.passed ? 'is-passed' : 'is-failed'}`}>
          <span className="tile__label">Тестовый балл{exam.test_score_approximate ? ' ≈' : ''}</span>
          <span className="tile__value">{exam.test_score} <span className="tile__of">из 100</span></span>
          <span className="tile__hint">
            {exam.university_passed
              ? '✓ выше порога для вузов (46)'
              : exam.passed
                ? '✓ порог 40 пройден · для вузов нужно 46'
                : '✗ ниже порога 40'}
          </span>
        </div>
        <div className="tile">
          <span className="tile__label">Первичный балл</span>
          <span className="tile__value">{exam.primary_score} <span className="tile__of">из {exam.max_score}</span></span>
          <span className="tile__hint">{percent}% от максимума варианта</span>
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

      {exam.test_score_approximate && (
        <p className="notice">
          Тестовый балл приблизительный: шкала Рособрнадзора рассчитана на полный вариант
          (29 первичных баллов), а в этом варианте задачи есть не по всем номерам — максимум {exam.max_score}.
        </p>
      )}

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
            <TaskMedia task={i} />
            {i.question && <p className="part__question"><span className="part__number">{i.exam_number}</span>{i.question}</p>}
            {i.explanation && <p className="verdict__explanation">{i.explanation}</p>}
            <Link to={`/tasks/${cardCode(i)}`} className="small">Задачи номера {cardCode(i)} →</Link>
          </details>
        ))}
      </div>
    </section>
  )
}

// Части 19, 20, 21 живут на одной карточке «19-21».
function cardCode(item) {
  return item.question ? '19-21' : item.exam_number
}
