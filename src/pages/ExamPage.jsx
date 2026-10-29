import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { finishExam, getCurrentExam, getExamHistory, saveExamAnswer, startExam } from '../api.js'
import { useAuth } from '../auth.jsx'
import TaskMedia from '../components/TaskMedia.jsx'

// /exam — пробник: экран старта или идущий пробник.
// Время считает сервер; страница только показывает отсчёт. Перезагрузка
// ничего не сбрасывает: /exam/current вернёт тот же пробник с ответами.
export default function ExamPage() {
  const { user, checking } = useAuth()
  const [exam, setExam] = useState(undefined) // undefined — грузим, null — пробника нет
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    getCurrentExam()
      .then(setExam) // null — идущего пробника нет, показываем старт
      .catch((e) => setError(e.message))
  }, [user])

  if (checking) return <p className="muted">Загрузка…</p>
  if (!user) return <Navigate to="/login" replace />
  if (error) return <p className="error">{error}</p>
  if (exam === undefined) return <p className="muted">Загрузка…</p>
  if (exam === null) return <ExamStart onStarted={setExam} />
  return <ExamRun exam={exam} />
}

// ---------- Старт ----------

function ExamStart({ onStarted }) {
  const [history, setHistory] = useState([])
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getExamHistory().then(setHistory).catch(() => {})
  }, [])

  async function begin() {
    setStarting(true)
    setError(null)
    try {
      onStarted(await startExam())
    } catch (e) {
      setError(e.message)
      setStarting(false)
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Пробный экзамен</h1>
        <p className="muted">Вариант в формате ЕГЭ: по одной задаче на каждый номер из банка.</p>
      </div>

      <div className="panel exam-rules">
        <ul>
          <li>Время идёт на сервере: закрыть вкладку или перезагрузить страницу можно — таймер не остановится и не сбросится.</li>
          <li>Ответы сохраняются сами, пока вы печатаете. Менять их можно до конца.</li>
          <li>Правильные ответы и разбор — только после завершения.</li>
          <li>Номера 26 и 27 стоят по 2 первичных балла, остальные — по 1. Итог переводится в тестовые баллы по шкале Рособрнадзора 2026 года (порог — 40, для вузов — 46).</li>
          <li>Когда время выйдет, пробник завершится автоматически.</li>
        </ul>
        <button className="btn" onClick={begin} disabled={starting}>
          {starting ? 'Собираем вариант…' : 'Начать пробник'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {history.length > 0 && (
        <div className="panel">
          <h2 className="panel__title">Мои пробники</h2>
          <ul className="recent">
            {history.map((h) => (
              <li key={h.id} className="recent__row exam-history__row">
                <span className="exam-history__score">
                  {h.test_score_approximate ? '≈' : ''}{h.test_score}
                  <span className="muted small"> тест. · {h.primary_score}/{h.max_score} перв.</span>
                </span>
                <span className="muted small">{formatDateTime(h.started_at)}</span>
                <Link to={`/exam/${h.id}`} className="recent__task">Разбор →</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

// ---------- Идущий пробник ----------

function ExamRun({ exam }) {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(exam.items.map((i) => [i.position, i.answer ?? ''])),
  )
  const [saveState, setSaveState] = useState({}) // position → saving | saved | error
  const [confirming, setConfirming] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const timers = useRef({})
  const finished = useRef(false)

  // Разница между часами сервера и компьютера — чтобы отсчёт не врал,
  // даже если часы на компьютере сбиты.
  const offset = useRef(new Date(exam.server_now).getTime() - Date.now())
  const deadline = new Date(exam.deadline_at).getTime()
  const [left, setLeft] = useState(() => deadline - (Date.now() + offset.current))

  async function finish() {
    if (finished.current) return
    finished.current = true
    setFinishing(true)
    Object.values(timers.current).forEach(clearTimeout)
    try {
      await finishExam(exam.id)
    } catch {
      // уже завершён сервером — результат всё равно доступен
    }
    navigate(`/exam/${exam.id}`, { replace: true })
  }

  // Отсчёт: раз в секунду. Время вышло — завершаем.
  useEffect(() => {
    const tick = setInterval(() => {
      const ms = deadline - (Date.now() + offset.current)
      setLeft(ms)
      if (ms <= 0) {
        clearInterval(tick)
        finish()
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [deadline])

  async function save(position, value) {
    setSaveState((s) => ({ ...s, [position]: 'saving' }))
    try {
      await saveExamAnswer(exam.id, position, value.trim())
      setSaveState((s) => ({ ...s, [position]: 'saved' }))
    } catch (e) {
      if (e.status === 409) return finish() // время вышло на сервере
      setSaveState((s) => ({ ...s, [position]: 'error' }))
    }
  }

  // Автосохранение: через 0,7 с после того, как перестали печатать, или при уходе из поля.
  function change(position, value) {
    setAnswers((a) => ({ ...a, [position]: value }))
    setSaveState((s) => ({ ...s, [position]: 'dirty' }))
    clearTimeout(timers.current[position])
    timers.current[position] = setTimeout(() => save(position, value), 700)
  }

  function blur(position) {
    if (saveState[position] !== 'dirty') return
    clearTimeout(timers.current[position])
    save(position, answers[position])
  }

  const answered = Object.values(answers).filter((v) => v.trim()).length
  const total = exam.items.length

  return (
    <section>
      <div className="exam-bar">
        <div>
          <strong>Пробник</strong>
          <span className="muted small"> · отвечено {answered} из {total}</span>
        </div>
        <div className={`timer ${left < 5 * 60 * 1000 ? 'timer--hurry' : ''}`} aria-live="off">
          {formatLeft(left)}
        </div>
      </div>

      <nav className="exam-nav" aria-label="Задания варианта">
        {exam.items.map((i) => (
          <a
            key={i.position}
            href={`#q${i.position}`}
            className={`exam-nav__item ${answers[i.position].trim() ? 'is-answered' : ''}`}
            title={i.title}
          >
            {i.exam_number}
          </a>
        ))}
      </nav>

      {exam.items.map((i) => (
        <article key={i.position} id={`q${i.position}`} className="task exam-task">
          <div className="task__meta">
            <span className="exam-task__number">№ {i.exam_number}</span>
            <span className="badge">{i.title}</span>
            <span className="badge">{i.points === 2 ? '2 балла' : '1 балл'}</span>
          </div>
          {i.question && i.exam_number !== '19' ? (
            // 20 и 21 — к той же игре, что и 19: условие свёрнуто, чтобы не повторять его трижды.
            <details className="exam-task__game">
              <summary>Условие игры (из задания 19)</summary>
              <p className="task__statement">{i.statement}</p>
              <TaskMedia task={i} />
            </details>
          ) : (
            <>
              <p className="task__statement">{i.statement}</p>
              <TaskMedia task={i} />
            </>
          )}
          {i.question && <p className="part__question"><span className="part__number">{i.exam_number}</span>{i.question}</p>}
          <div className="answer">
            <label className="answer__label" htmlFor={`exam-${i.position}`}>Ответ</label>
            <input
              id={`exam-${i.position}`}
              className="answer__input"
              value={answers[i.position]}
              onChange={(e) => change(i.position, e.target.value)}
              onBlur={() => blur(i.position)}
              maxLength={100}
              autoComplete="off"
              disabled={finishing}
            />
            <SaveMark state={saveState[i.position]} />
          </div>
        </article>
      ))}

      <div className="exam-finish">
        {!confirming ? (
          <button className="btn" onClick={() => setConfirming(true)} disabled={finishing}>
            Завершить пробник
          </button>
        ) : (
          <>
            <p>
              Завершить? {total - answered > 0 ? `Без ответа: ${total - answered}. ` : ''}
              Изменить ответы будет нельзя.
            </p>
            <button className="btn" onClick={finish} disabled={finishing}>
              {finishing ? 'Проверяем…' : 'Да, завершить'}
            </button>
            <button className="btn btn--ghost" onClick={() => setConfirming(false)} disabled={finishing}>
              Продолжить решать
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function SaveMark({ state }) {
  if (state === 'saving' || state === 'dirty') return <span className="save-mark muted small">сохраняю…</span>
  if (state === 'saved') return <span className="save-mark save-mark--ok small">✓ сохранено</span>
  if (state === 'error') return <span className="save-mark error small">не сохранилось — повторите</span>
  return null
}

function formatLeft(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
