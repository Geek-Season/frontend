import { useState } from 'react'

import { checkAnswer, getSolution } from '../api.js'
import Markdown from './Markdown.jsx'
import { announceRankUp } from './RankUp.jsx'
import TaskMedia from './TaskMedia.jsx'

const SOURCE_LABELS = { demo: 'Демо', official: 'Экзамен', approbation: 'Апробация', author: 'Авторская' }
const STATUS_LABELS = { solved: '✓ Решена', failed: '✗ Не решена' }

// Одна задача: условие, поле ответа, кнопка «Проверить» и результат.
// У задачи 19–21 вместо одного поля — три вопроса со своими полями (task.parts).
//
// Неверный ответ — только «Неверно»: правильный ответ и разбор сервер не присылает,
// пока ученик не ошибётся трижды (или не решит задачу). Тогда появляется кнопка
// «Показать ответ и разбор».
export default function TaskCard({ task, position, onChecked }) {
  const hasParts = task.parts?.length > 0
  const [answer, setAnswer] = useState('')
  const [partAnswers, setPartAnswers] = useState(() => Object.fromEntries((task.parts ?? []).map((p) => [p.number, ''])))
  const [result, setResult] = useState(null) // ответ бэкенда после проверки
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)
  const [available, setAvailable] = useState(Boolean(task.solution_available)) // можно открыть разбор
  const [solution, setSolution] = useState(null) // открытый ответ и разбор
  const [opening, setOpening] = useState(false)

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
      if (checked.solution_available) setAvailable(true)
      announceRankUp(checked.rank_up)
      onChecked?.(task.id, checked.is_correct, checked.solution_available)
    } catch (e) {
      setError(e.message)
    } finally {
      setChecking(false)
    }
  }

  async function openSolution() {
    setOpening(true)
    setError(null)
    try {
      setSolution(await getSolution(task.id))
    } catch (e) {
      setError(e.message)
    } finally {
      setOpening(false)
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
                      {r.is_correct ? '✓' : '✗'}
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
          <VerdictLine result={result} hasParts={hasParts} />{' '}
          {!result.is_correct && result.attempts_left > 0 && (
            <span className="verdict__hint">
              Подумайте ещё — разбор можно будет открыть после {mistakes(result.attempts_left)}.
            </span>
          )}
          {result.is_correct && result.explanation && (
            <Markdown className="verdict__explanation" text={result.explanation} />
          )}
        </div>
      )}

      {available && !solution && !result?.is_correct && (
        <button type="button" className="btn btn--ghost btn--small task__reveal" onClick={openSolution} disabled={opening}>
          {opening ? 'Открываем…' : 'Показать ответ и разбор'}
        </button>
      )}

      {solution && !result?.is_correct && <Solution solution={solution} />}
    </article>
  )
}

/** «1 ошибки», «2 ошибок» — для подсказки «разбор откроется после ещё …» */
function mistakes(n) {
  return `ещё ${n} ${n === 1 ? 'ошибки' : 'ошибок'}`
}

function Solution({ solution }) {
  return (
    <div className="verdict verdict--solution">
      {solution.parts.length > 0 ? (
        solution.parts.map((p) => (
          <div key={p.number} className="solution__part">
            <strong>{p.number}:</strong> <code>{p.correct_answer}</code>
            {p.explanation && <Markdown className="verdict__explanation" text={p.explanation} />}
          </div>
        ))
      ) : (
        <><strong>Правильный ответ:</strong> <code>{solution.correct_answer}</code></>
      )}
      {solution.explanation && <Markdown className="verdict__explanation" text={solution.explanation} />}
    </div>
  )
}

/**
 * Первая строка вердикта. Вошедший ученик видит, сколько PTS начислено или снято
 * (засчитывается только первая попытка по задаче); гость — просто «Верно!» / «Неверно.».
 * У 19–21 с частично верными ответами PTS может и прибавиться: засчитывается доля верных.
 */
function VerdictLine({ result, hasParts }) {
  const ok = result.is_correct
  const partial = hasParts && !ok
  const head = partial
    ? `Верно ${result.parts.filter((p) => p.is_correct).length} из ${result.parts.length}.`
    : ok ? 'Верно!' : 'Неверно.'

  if (result.pts_delta == null) {
    return (
      <>
        <strong>{head}</strong>
        {result.pts_repeat && <span className="verdict__hint"> PTS не изменились — засчитывается только первая попытка.</span>}
      </>
    )
  }

  const points = Math.abs(Math.round(result.pts_delta))
  const change = points === 0
    ? <>PTS почти не изменились.</>
    : result.pts_delta > 0
      ? <>вам начислено <span className="pts pts--up">{points} PTS</span>.</>
      : <>с вас снято <span className="pts pts--down">{points} PTS</span>.</>

  if (partial) return <><strong>{head}</strong> {points === 0 ? change : <>{result.pts_delta > 0 ? 'Вам начислено' : 'С вас снято'} <span className={`pts ${result.pts_delta > 0 ? 'pts--up' : 'pts--down'}`}>{points} PTS</span>.</>}</>
  if (points === 0) return <><strong>{ok ? 'Вы ответили верно.' : 'Вы ответили неверно.'}</strong> {change}</>
  return <><strong>{ok ? 'Вы ответили верно' : 'Вы ответили неверно'}</strong>, {change}</>
}
