import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'

import { answerHomework, submitHomework } from '../api.js'
import { useAuth } from '../auth.jsx'
import Markdown from '../components/Markdown.jsx'
import { announceRankUp } from '../components/RankUp.jsx'
import { Solution, SOURCE_LABELS, VerdictLine } from '../components/TaskCard.jsx'
import TaskMedia from '../components/TaskMedia.jsx'
import { keys, useHomework, useInvalidate, useMe } from '../queries.js'
import { tasksWord } from './HomeworkListPage.jsx'

// /homework/5 — домашка: по одной задаче, квадратики сверху — навигация.
// На каждую задачу одна попытка; верно или нет — видно сразу, ответ и разбор — после «Сдать».
// Текущая задача — в адресе (?n=3): F5 и «Назад» возвращают к ней.
export default function HomeworkPage() {
  const { id } = useParams()
  const { user, checking } = useAuth()
  const query = useHomework(id)

  if (checking) return <p className="muted">Загрузка…</p>
  if (!user) return <Navigate to="/login" replace />
  if (query.error) {
    return (
      <div className="placeholder">
        <h1>Домашка</h1>
        <p>{query.error.status === 404 ? 'Такой домашки нет.' : query.error.message}</p>
        <Link to="/homework" className="btn btn--ghost">← Все домашки</Link>
      </div>
    )
  }
  if (query.isPending) return <p className="muted">Загрузка…</p>
  return <Homework homework={query.data} />
}

function Homework({ homework: hw }) {
  const [params, setParams] = useSearchParams()
  const submitted = Boolean(hw.submitted_at)
  const total = hw.items.length
  // По умолчанию — первая задача без ответа (или первая, если ответы есть на всё).
  // Запоминаем её один раз: иначе сразу после ответа страница перескочила бы на следующую
  // задачу, и ученик не увидел бы вердикт.
  const [start] = useState(() => Math.max(hw.items.findIndex((i) => i.is_correct === null), 0))
  const fromUrl = Number(params.get('n'))
  const index = fromUrl >= 1 && fromUrl <= total ? fromUrl - 1 : start
  const item = hw.items[index]
  const go = (i) => setParams({ n: String(i + 1) }, { replace: true })

  return (
    <section className="hw">
      <Link to="/homework" className="muted small">← Домашки</Link>
      <div className="page-head hw__head">
        <h1>{hw.title}</h1>
        <p className="muted">
          {submitted
            ? <>Сдана · верно <strong className="hw__score">{hw.correct} из {total}</strong></>
            : <>Отвечено {hw.answered} из {total} · на каждую задачу одна попытка</>}
        </p>
        {hw.comment && <p className="hw__comment">«{hw.comment}»</p>}
      </div>

      <nav className="hw-steps" aria-label="Задачи домашки">
        {hw.items.map((it, i) => (
          <button
            key={it.position}
            type="button"
            className={`hw-steps__item ${stepClass(it, submitted)} ${i === index ? 'is-current' : ''}`}
            aria-current={i === index ? 'step' : undefined}
            title={`Задача ${i + 1} · №${it.task.exam_number}${stepTitle(it, submitted)}`}
            onClick={() => go(i)}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <HomeworkTask key={item.position} homework={hw} item={item} index={index} total={total} submitted={submitted} />

      <div className="hw__arrows">
        <button type="button" className="btn btn--ghost btn--small" onClick={() => go(index - 1)} disabled={index === 0}>
          ← Назад
        </button>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => go(index + 1)} disabled={index === total - 1}>
          Дальше →
        </button>
      </div>

      {!submitted && <SubmitBar homework={hw} />}
    </section>
  )
}

function stepClass(item, submitted) {
  if (item.is_correct === true) return 'is-ok'
  if (item.is_correct === false) return 'is-bad'
  return submitted ? 'is-skipped' : ''
}

function stepTitle(item, submitted) {
  if (item.is_correct === true) return ' — верно'
  if (item.is_correct === false) return ' — неверно'
  return submitted ? ' — без ответа' : ''
}

function HomeworkTask({ homework, item, index, total, submitted }) {
  const { task } = item
  const hasParts = task.parts.length > 0
  const me = useMe()
  const queryClient = useQueryClient()
  const invalidate = useInvalidate()
  const [answer, setAnswer] = useState('')
  const [partAnswers, setPartAnswers] = useState(() => Object.fromEntries(task.parts.map((p) => [p.number, ''])))
  const [result, setResult] = useState(null) // ответ сервера сразу после попытки (с PTS)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const answered = item.is_correct !== null
  const canSend = hasParts ? Object.values(partAnswers).some((v) => v.trim()) : Boolean(answer.trim())
  const partOf = (number) => item.parts?.find((p) => p.number === number)

  async function send(event) {
    event.preventDefault()
    if (!canSend || sending) return
    setSending(true)
    setError(null)
    const payload = hasParts
      ? Object.fromEntries(Object.entries(partAnswers).map(([n, v]) => [n, v.trim()]))
      : answer.trim()
    try {
      const checked = await answerHomework(homework.id, task.id, payload)
      setResult(checked)
      announceRankUp(checked.rank_up)
      // Домашку обновляем на месте: квадратик и счётчик меняются сразу, без перезагрузки.
      queryClient.setQueryData(keys.homework(me, homework.id), (data) => data && {
        ...data,
        answered: data.answered + 1,
        correct: data.correct + (checked.is_correct ? 1 : 0),
        items: data.items.map((it) => it.task.id === task.id
          ? {
            ...it,
            is_correct: checked.is_correct,
            answer: hasParts ? checked.parts.map((p) => `${p.number}: ${p.answer || '—'}`).join('; ') : payload,
            parts: hasParts ? checked.parts : null,
          }
          : it),
      })
      invalidate.homeworkAnswered(homework.id, checked.is_correct)
    } catch (e) {
      setError(e.message)
      // 409 — ответ уже есть (например, из другой вкладки): показать то, что на сервере.
      if (e.status === 409) queryClient.invalidateQueries({ queryKey: keys.homework(me, homework.id) })
    } finally {
      setSending(false)
    }
  }

  return (
    <article className={`task hw-task ${item.is_correct === true ? 'task--solved' : ''}`}>
      <div className="task__meta">
        <span className="task__pos">Задача {index + 1} из {total} · №{task.exam_number}</span>
        <span className={`badge badge--${task.source}`}>{task.source_label || SOURCE_LABELS[task.source]}</span>
        <span className="badge">сложность {task.difficulty}/100</span>
      </div>

      <Markdown className="task__statement" text={task.statement} />
      <TaskMedia task={task} />

      {hasParts && task.parts.map((p) => {
        const mine = partOf(p.number)
        return (
          <div key={p.number} className="part">
            <div className="part__question"><span className="part__number">{p.number}</span><Markdown text={p.question} /></div>
            {!answered && !submitted && (
              <div className="answer">
                <label className="answer__label" htmlFor={`hw-${task.id}-${p.number}`}>Ответ {p.number}</label>
                <input
                  id={`hw-${task.id}-${p.number}`}
                  className="answer__input"
                  value={partAnswers[p.number]}
                  onChange={(e) => setPartAnswers((a) => ({ ...a, [p.number]: e.target.value }))}
                  placeholder="—"
                  maxLength={100}
                  autoComplete="off"
                  disabled={sending}
                />
              </div>
            )}
            {mine && (
              <p className="hw-task__mine small">
                Ваш ответ: <code>{mine.answer || '—'}</code>{' '}
                <span className={mine.is_correct ? 'part__ok' : 'part__bad'}>{mine.is_correct ? '✓' : '✗'}</span>
              </p>
            )}
          </div>
        )
      })}

      {!answered && !submitted && (
        <form className={hasParts ? 'hw-task__send' : 'answer'} onSubmit={send}>
          {!hasParts && (
            <>
              <label className="answer__label" htmlFor={`hw-${task.id}`}>Ответ</label>
              <input
                id={`hw-${task.id}`}
                className="answer__input"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="—"
                maxLength={100}
                autoComplete="off"
                disabled={sending}
              />
            </>
          )}
          <button className="btn" disabled={!canSend || sending}>{sending ? 'Проверяем…' : 'Проверить'}</button>
        </form>
      )}
      {!answered && !submitted && <p className="muted small hw-task__hint">Попытка одна: исправить ответ потом не получится.</p>}

      {error && <p className="error">{error}</p>}

      {answered && (
        <div className={`verdict ${item.is_correct ? 'verdict--ok' : 'verdict--bad'}`}>
          {result ? <VerdictLine result={result} hasParts={hasParts} /> : (
            <strong>{item.is_correct ? 'Верно.' : hasParts ? `Верно ${item.parts.filter((p) => p.is_correct).length} из ${item.parts.length}.` : 'Неверно.'}</strong>
          )}
          {!hasParts && <span className="verdict__hint"> Ваш ответ: <code>{item.answer}</code>.</span>}
          {!submitted && <span className="verdict__hint"> Разбор откроется после сдачи домашки.</span>}
        </div>
      )}

      {submitted && !answered && (
        <div className="verdict verdict--bad">
          <strong>Без ответа</strong> <span className="verdict__hint">— засчитано как неверное.</span>
        </div>
      )}

      {item.solution && <Solution solution={item.solution} />}
    </article>
  )
}

function SubmitBar({ homework: hw }) {
  const invalidate = useInvalidate()
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const skipped = hw.items.length - hw.answered

  async function submit() {
    setSending(true)
    setError(null)
    try {
      invalidate.homeworkSubmitted(hw.id, await submitHomework(hw.id))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e.message)
      setSending(false)
    }
  }

  return (
    <div className="hw-submit">
      {!confirming ? (
        <button type="button" className="btn" onClick={() => setConfirming(true)}>Сдать домашку</button>
      ) : (
        <>
          <p>
            {skipped > 0
              ? <>Без ответа: {tasksWord(skipped)} — они будут засчитаны неверными. </>
              : <>Ответы есть на все задачи. </>}
            После сдачи ответить уже нельзя, зато откроются разборы. Сдать?
          </p>
          <div className="btns">
            <button type="button" className="btn" onClick={submit} disabled={sending}>{sending ? 'Сдаём…' : 'Да, сдать'}</button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)} disabled={sending}>Отмена</button>
          </div>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  )
}
