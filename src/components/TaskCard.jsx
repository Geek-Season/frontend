import { useState } from 'react'

import { checkAnswer } from '../api.js'
import Markdown from './Markdown.jsx'
import TaskMedia from './TaskMedia.jsx'

const SOURCE_LABELS = { demo: 'Демо', official: 'Экзамен', author: 'Авторская' }
const STATUS_LABELS = { solved: '✓ Решена', failed: '✗ Не решена' }

// Одна задача: условие, поле ответа, кнопка «Проверить» и результат.
// У задачи 19–21 вместо одного поля — три вопроса со своими полями (task.parts).
export default function TaskCard({ task, position, onChecked }) {
  const hasParts = task.parts?.length > 0
  const [answer, setAnswer] = useState('')
  const [partAnswers, setPartAnswers] = useState(() => Object.fromEntries((task.parts ?? []).map((p) => [p.number, ''])))
  const [result, setResult] = useState(null) // ответ бэкенда после проверки
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault() // не перезагружать страницу при отправке формы
    if (!canSubmit) return
    setChecking(true)
    setError(null)
    try {
      const payload = hasParts
        ? Object.fromEntries(Object.entries(partAnswers).map(([n, v]) => [n, v.trim()]))
        : answer.trim()
      const checked = await checkAnswer(task.id, payload)
      setResult(checked)
      onChecked?.(task.id, checked.is_correct)
    } catch (e) {
      setError(e.message)
    } finally {
      setChecking(false)
    }
  }

  const canSubmit = hasParts ? Object.values(partAnswers).some((v) => v.trim()) : Boolean(answer.trim())
  const partResult = (number) => result?.parts?.find((p) => p.number === number)

  return (
    <article className={`task ${task.status === 'solved' ? 'task--solved' : ''}`}>
      <div className="task__meta">
        <span className="task__pos">#{position}</span>
        <span className={`badge badge--${task.source}`}>
          {task.source_label || SOURCE_LABELS[task.source]}
        </span>
        <span className="badge">сложность {task.difficulty}/100</span>
        {task.status && (
          <span className={`badge badge--status-${task.status}`}>{STATUS_LABELS[task.status]}</span>
        )}
        <span className="task__id">id {task.id}</span>
      </div>

      <Markdown className="task__statement" text={task.statement} />
      <TaskMedia task={task} />

      {hasParts ? (
        <form className="parts" onSubmit={handleSubmit}>
          {task.parts.map((p) => {
            const r = partResult(p.number)
            return (
              <div key={p.number} className="part">
                <div className="part__question"><span className="part__number">{p.number}</span><Markdown text={p.question} /></div>
                <div className="answer">
                  <label className="answer__label" htmlFor={`answer-${task.id}-${p.number}`}>Ответ {p.number}</label>
                  <input
                    id={`answer-${task.id}-${p.number}`}
                    className={`answer__input ${r ? (r.is_correct ? 'ok' : 'bad') : ''}`}
                    value={partAnswers[p.number]}
                    onChange={(e) => {
                      setPartAnswers((a) => ({ ...a, [p.number]: e.target.value }))
                      setResult(null)
                    }}
                    placeholder="—"
                    maxLength={100}
                    autoComplete="off"
                  />
                  {r && (
                    <span className={r.is_correct ? 'part__ok' : 'part__bad'}>
                      {r.is_correct ? '✓' : <>✗ правильно: <code>{r.correct_answer}</code></>}
                    </span>
                  )}
                </div>
                {r?.explanation && <Markdown className="verdict__explanation" text={r.explanation} />}
              </div>
            )
          })}
          <button className="btn" disabled={!canSubmit || checking}>
            {checking ? 'Проверяем…' : 'Проверить'}
          </button>
        </form>
      ) : (
      <form className="answer" onSubmit={handleSubmit}>
        <label className="answer__label" htmlFor={`answer-${task.id}`}>Ответ</label>
        <input
          id={`answer-${task.id}`}
          className={`answer__input ${result ? (result.is_correct ? 'ok' : 'bad') : ''}`}
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value)
            setResult(null)
          }}
          placeholder="—"
          maxLength={100}
          autoComplete="off"
        />
        <button className="btn" disabled={!canSubmit || checking}>
          {checking ? 'Проверяем…' : 'Проверить'}
        </button>
      </form>
      )}

      {error && <p className="error">{error}</p>}

      {result && (
        <div className={`verdict ${result.is_correct ? 'verdict--ok' : 'verdict--bad'}`}>
          <strong>
            {result.is_correct
              ? 'Верно!'
              : hasParts
                ? `Верно ${result.parts.filter((p) => p.is_correct).length} из ${result.parts.length}.`
                : 'Неверно.'}
          </strong>{' '}
          {!result.is_correct && !hasParts && <>Правильный ответ: <code>{result.correct_answer}</code></>}
          {result.explanation && <Markdown className="verdict__explanation" text={result.explanation} />}
        </div>
      )}
    </article>
  )
}
