import { useState } from 'react'

import { checkAnswer } from '../api.js'

const SOURCE_LABELS = { demo: 'Демо', official: 'Экзамен', author: 'Авторская' }

// Одна задача: условие, поле ответа, кнопка «Проверить» и результат.
export default function TaskCard({ task, position }) {
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null) // ответ бэкенда после проверки
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault() // не перезагружать страницу при отправке формы
    if (!answer.trim()) return
    setChecking(true)
    setError(null)
    try {
      setResult(await checkAnswer(task.id, answer.trim()))
    } catch (e) {
      setError(e.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <article className="task">
      <div className="task__meta">
        <span className="task__pos">#{position}</span>
        <span className={`badge badge--${task.source}`}>
          {task.source_label || SOURCE_LABELS[task.source]}
        </span>
        <span className="badge">сложность {task.difficulty}/100</span>
        <span className="task__id">id {task.id}</span>
      </div>

      <p className="task__statement">{task.statement}</p>
      {task.image_url && <img className="task__image" src={task.image_url} alt="Иллюстрация к задаче" />}

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
          autoComplete="off"
        />
        <button className="btn" disabled={!answer.trim() || checking}>
          {checking ? 'Проверяем…' : 'Проверить'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className={`verdict ${result.is_correct ? 'verdict--ok' : 'verdict--bad'}`}>
          <strong>{result.is_correct ? 'Верно!' : 'Неверно.'}</strong>{' '}
          {!result.is_correct && <>Правильный ответ: <code>{result.correct_answer}</code></>}
          {result.explanation && <p className="verdict__explanation">{result.explanation}</p>}
        </div>
      )}
    </article>
  )
}
