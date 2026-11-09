import { useEffect, useState } from 'react'

import {
  addHomeworkStudents,
  createHomework,
  deleteHomework,
  getRandomHomeworkTasks,
  sendHomework,
  updateHomework,
} from '../../api.js'
import Avatar from '../../components/Avatar.jsx'
import { plainText } from '../../components/Markdown.jsx'
import { SOURCE_LABELS } from '../../components/TaskCard.jsx'
import { useAdminHomework, useAdminUsers, useHomeworkPicker, useInvalidate, useNumbers } from '../../queries.js'

const RANDOM_COUNT = 3

/** Текст из поля поиска — в запрос, когда перестали печатать. */
function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

// Конструктор: название, комментарий, задачи из банка, ученики.
// id = null — новая домашка. Черновик меняется целиком; у отправленной — только название,
// комментарий и новые ученики (задачи уже у учеников).
export default function HomeworkBuilder({ id, onClose, onSaved }) {
  const query = useAdminHomework(id)
  if (id != null && query.error) return <p className="error">{query.error.message}</p>
  if (id != null && query.isPending) return <p className="muted">Загрузка…</p>
  return <Builder initial={id != null ? query.data : null} onClose={onClose} onSaved={onSaved} />
}

function Builder({ initial, onClose, onSaved }) {
  const invalidate = useInvalidate()
  const sent = Boolean(initial?.sent_at)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [tasks, setTasks] = useState(initial?.tasks ?? [])
  const [students, setStudents] = useState(initial?.students ?? [])
  const lockedStudents = new Set(sent ? initial.students.map((s) => s.id) : [])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const names = Object.fromEntries(students.map((s) => [s.id, s.display_name]))

  function moveTask(index, delta) {
    setTasks((list) => {
      const next = [...list]
      const [moved] = next.splice(index, 1)
      next.splice(index + delta, 0, moved)
      return next
    })
  }

  function toggleTask(task) {
    setTasks((list) => (list.some((t) => t.id === task.id) ? list.filter((t) => t.id !== task.id) : [...list, task]))
  }

  async function save({ andSend = false } = {}) {
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Введите название' })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      let saved
      if (sent) {
        saved = await updateHomework(initial.id, { title, comment })
        const added = students.filter((s) => !lockedStudents.has(s.id)).map((s) => s.id)
        if (added.length) saved = await addHomeworkStudents(initial.id, added)
      } else {
        const body = { title, comment, task_ids: tasks.map((t) => t.id), user_ids: students.map((s) => s.id) }
        saved = initial ? await updateHomework(initial.id, body) : await createHomework(body)
        if (andSend) saved = await sendHomework(saved.id)
      }
      invalidate.homeworkChanged()
      if (andSend || sent) {
        onClose(saved)
      } else {
        setMessage({ type: 'success', text: 'Черновик сохранён' })
        onSaved(saved)
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
      invalidate.homeworkChanged() // черновик мог сохраниться, а отправка — нет
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await deleteHomework(initial.id)
      invalidate.homeworkChanged()
      onClose(null)
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
      setBusy(false)
    }
  }

  const newStudents = students.filter((s) => !lockedStudents.has(s.id)).length

  return (
    <div className="hw-builder">
      <button type="button" className="btn btn--ghost btn--small" onClick={() => onClose(null)}>← Все домашки</button>
      <h2 className="hw-builder__title">{initial ? (sent ? 'Отправленная домашка' : 'Черновик') : 'Новая домашка'}</h2>
      {sent && <p className="muted small">Задачи уже у учеников — их не поменять. Можно исправить название и комментарий и добавить учеников.</p>}

      <label className="field">
        <span className="field__label">Название</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Рекурсия: разогрев" />
      </label>
      <label className="field">
        <span className="field__label">Комментарий ученику (необязательно)</span>
        <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder="Сначала 16-й, потом 23-й" />
      </label>

      <div className="hw-builder__panels">
        {!sent && <TaskPicker selected={tasks} students={students} names={names} onToggle={toggleTask} onAdd={(more) => setTasks((list) => [...list, ...more])} />}
        <SelectedTasks tasks={tasks} names={names} readOnly={sent} onMove={moveTask} onRemove={toggleTask} />
      </div>

      <StudentPicker students={students} locked={lockedStudents} onChange={setStudents} />

      {message && <p className={message.type}>{message.text}</p>}

      <div className="hw-builder__actions">
        {initial && !confirmDelete && (
          <button type="button" className="btn btn--danger-outline" onClick={() => setConfirmDelete(true)} disabled={busy}>Удалить</button>
        )}
        {confirmDelete && (
          <span className="hw-builder__confirm">
            <span className="small">{sent ? 'Домашка пропадёт у учеников (их ответы и PTS останутся).' : 'Удалить черновик?'}</span>
            <button type="button" className="btn btn--danger btn--small" onClick={remove} disabled={busy}>Да, удалить</button>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setConfirmDelete(false)}>Отмена</button>
          </span>
        )}
        <span className="hw-builder__spacer" />
        {sent ? (
          <button type="button" className="btn" onClick={() => save()} disabled={busy}>
            {newStudents ? `Сохранить и отправить ещё ${dative(newStudents)}` : 'Сохранить'}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn--ghost" onClick={() => save()} disabled={busy}>Сохранить черновик</button>
            <button
              type="button"
              className="btn"
              onClick={() => save({ andSend: true })}
              disabled={busy || tasks.length === 0 || students.length === 0}
              title={tasks.length === 0 ? 'Добавьте задачи' : students.length === 0 ? 'Выберите учеников' : undefined}
            >
              {students.length ? `Отправить ${dative(students.length)}` : 'Отправить'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** «1 ученику», «2 ученикам» */
function dative(n) {
  return `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'ученику' : 'ученикам'}`
}

function triedLabel(task, names, studentsCount) {
  if (!task.tried_by?.length) return null
  if (studentsCount === 1) return 'ученик уже решал'
  return `уже решал${task.tried_by.length > 1 ? 'и' : ''}: ${task.tried_by.map((id) => names[id] ?? `#${id}`).join(', ')}`
}

function TaskPicker({ selected, students, names, onToggle, onAdd }) {
  const numbers = useNumbers().data ?? []
  const [number, setNumber] = useState('')
  const [text, setText] = useState('')
  const q = useDebounced(text)
  const userIds = students.map((s) => s.id)
  const query = useHomeworkPicker({ number, q, userIds })
  const [randomError, setRandomError] = useState(null)
  const [adding, setAdding] = useState(false)
  const chosen = new Set(selected.map((t) => t.id))
  const items = query.data?.items ?? []

  async function addRandom() {
    setAdding(true)
    setRandomError(null)
    try {
      const more = await getRandomHomeworkTasks({ number, count: RANDOM_COUNT, user_ids: userIds, exclude_task_ids: [...chosen] })
      if (more.length === 0) setRandomError('Подходящих задач не осталось: все уже выбраны или решены учениками.')
      else if (more.length < RANDOM_COUNT) setRandomError(`Нашлось только ${more.length}.`)
      onAdd(more)
    } catch (e) {
      setRandomError(e.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="hw-panel">
      <div className="hw-panel__head">
        <select className="select" value={number} onChange={(e) => { setNumber(e.target.value); setRandomError(null) }} aria-label="Номер ЕГЭ">
          <option value="">Все номера</option>
          {numbers.map((n) => <option key={n.code} value={n.code}>№{n.code} · {n.title}</option>)}
        </select>
        <input className="input hw-panel__search" type="search" placeholder="Поиск по тексту" value={text} onChange={(e) => setText(e.target.value)} />
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={addRandom}
          disabled={!number || adding}
          title={number ? 'Случайные задачи номера, которых выбранные ученики ещё не решали' : 'Сначала выберите номер'}
        >
          + {RANDOM_COUNT} случайных
        </button>
      </div>
      {randomError && <p className="muted small hw-panel__note">{randomError}</p>}
      {query.error && <p className="error hw-panel__note">{query.error.message}</p>}
      {query.isPending && <p className="muted small hw-panel__note">Загрузка…</p>}
      {query.data && items.length === 0 && <p className="muted small hw-panel__note">Ничего не нашлось.</p>}
      <ul className="hw-pick">
        {items.map((t) => {
          const on = chosen.has(t.id)
          const tried = triedLabel(t, names, students.length)
          return (
            <li key={t.id}>
              <label className={`hw-pick__row ${on ? 'is-on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => onToggle(t)} />
                <span className="hw-pick__body">
                  <span className="hw-pick__meta small">
                    <span className="mono muted">№{t.exam_number} · #{t.id}</span>
                    <span className={`badge badge--${t.source}`}>{t.source_label || SOURCE_LABELS[t.source]}</span>
                    <span className="muted">сложность {t.difficulty}</span>
                    {tried && <span className="badge badge--status-solved">{tried}</span>}
                  </span>
                  <span className="hw-pick__text">{plainText(t.statement)}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {query.data && query.data.total > items.length && (
        <p className="muted small hw-panel__note">Показаны {items.length} из {query.data.total} — уточните номер или поиск.</p>
      )}
    </div>
  )
}

function SelectedTasks({ tasks, names, readOnly, onMove, onRemove }) {
  const counts = tasks.reduce((acc, t) => ({ ...acc, [t.exam_number]: (acc[t.exam_number] ?? 0) + 1 }), {})
  return (
    <div className="hw-panel">
      <div className="hw-panel__head">
        <strong className="hw-panel__grow">Выбрано: {tasks.length}</strong>
        <span className="muted small">{Object.entries(counts).map(([code, n]) => `№${code} ×${n}`).join(' · ')}</span>
      </div>
      {tasks.length === 0 && <p className="muted small hw-panel__note">Отметьте задачи слева.</p>}
      <ol className="hw-selected">
        {tasks.map((t, i) => (
          <li key={t.id} className="hw-selected__row">
            <span className="mono muted">{i + 1}</span>
            <span className="hw-selected__text">
              <span className="mono">№{t.exam_number} · #{t.id}</span>{' '}
              <span className="muted small">{plainText(t.statement).slice(0, 80)}</span>
              {t.is_archived && <span className="badge"> в архиве</span>}
              {t.tried_by?.length > 0 && <span className="muted small"> · решал: {t.tried_by.map((id) => names[id] ?? `#${id}`).join(', ')}</span>}
            </span>
            {!readOnly && (
              <span className="hw-selected__actions">
                <button type="button" className="btn btn--ghost btn--icon-sm" onClick={() => onMove(i, -1)} disabled={i === 0} aria-label="Выше">↑</button>
                <button type="button" className="btn btn--ghost btn--icon-sm" onClick={() => onMove(i, 1)} disabled={i === tasks.length - 1} aria-label="Ниже">↓</button>
                <button type="button" className="btn btn--ghost btn--icon-sm" onClick={() => onRemove(t)} aria-label="Убрать">✕</button>
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function StudentPicker({ students, locked, onChange }) {
  const [text, setText] = useState('')
  const q = useDebounced(text)
  const query = useAdminUsers({ q, filter: 'all', sort: 'name' })
  const chosen = new Set(students.map((s) => s.id))
  const found = q ? (query.data?.pages?.[0]?.items ?? []).filter((u) => !chosen.has(u.id) && !u.blocked).slice(0, 8) : []

  function add(user) {
    onChange([...students, { id: user.id, display_name: user.display_name, avatar_url: user.avatar_url }])
    setText('')
  }

  return (
    <div className="field">
      <span className="field__label">Кому</span>
      <div className="hw-students">
        {students.map((s) => (
          <span key={s.id} className="hw-tag">
            <Avatar name={s.display_name} url={s.avatar_url} size="small" />
            {s.display_name}
            {!locked.has(s.id) && (
              <button type="button" className="hw-tag__x" onClick={() => onChange(students.filter((x) => x.id !== s.id))} aria-label={`Убрать ${s.display_name}`}>✕</button>
            )}
          </span>
        ))}
        <input
          className="hw-students__search"
          type="search"
          placeholder="Найти ученика…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && found[0]) { e.preventDefault(); add(found[0]) } }}
        />
      </div>
      {found.length > 0 && (
        <ul className="hw-found">
          {found.map((u) => (
            <li key={u.id}>
              <button type="button" className="hw-found__item" onClick={() => add(u)}>
                <Avatar name={u.display_name} url={u.avatar_url} size="small" />
                <span>{u.display_name}</span>
                <span className="muted small">{u.username ? `@${u.username}` : ''}{u.role === 'admin' ? ' · админ' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && query.data && found.length === 0 && <p className="muted small">Никого не нашлось.</p>}
    </div>
  )
}
