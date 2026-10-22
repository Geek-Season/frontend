import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { archiveTask, createTask, getNumberTasks, getNumbers, getTaskFull, updateTask } from '../api.js'
import { useAuth } from '../auth.jsx'

const EMPTY = {
  statement: '',
  correct_answer: '',
  explanation: '',
  source: 'author',
  source_label: '',
  difficulty: 50,
  image_url: '',
}

const SOURCES = [
  { value: 'author', label: 'Авторская' },
  { value: 'demo', label: 'Демоверсия' },
  { value: 'official', label: 'Реальный экзамен' },
]

// /admin — редактор банка задач. Только для роли admin (сервер всё равно проверит сам).
export default function AdminPage() {
  const { user, checking } = useAuth()
  const [numbers, setNumbers] = useState([])
  const [code, setCode] = useState('1')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null — форма закрыта, {id?, ...поля} — открыта
  const [reload, setReload] = useState(0)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (user?.role !== 'admin') return
    getNumbers().then(setNumbers).catch(() => {})
  }, [user, reload])

  useEffect(() => {
    if (user?.role !== 'admin') return
    let cancelled = false
    setLoading(true)
    getNumberTasks(code, { sort: 'new', limit: 100 })
      .then((page) => !cancelled && setTasks(page.items))
      .catch((e) => !cancelled && setMessage({ type: 'error', text: e.message }))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [code, user, reload])

  if (checking) return <p className="muted">Загрузка…</p>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') {
    return (
      <div className="placeholder">
        <h1>Редактор задач</h1>
        <p>Только для администратора.</p>
      </div>
    )
  }

  async function openEdit(id) {
    setMessage(null)
    try {
      const full = await getTaskFull(id)
      setEditing({
        ...full,
        explanation: full.explanation ?? '',
        source_label: full.source_label ?? '',
        image_url: full.image_url ?? '',
      })
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  async function archive(task) {
    await archiveTask(task.id)
    setMessage({ type: 'ok', text: `Задача id ${task.id} убрана в архив` })
    setReload((r) => r + 1)
  }

  function saved(text) {
    setEditing(null)
    setMessage({ type: 'ok', text })
    setReload((r) => r + 1)
  }

  const current = numbers.find((n) => n.code === code)

  return (
    <section>
      <div className="page-head">
        <h1>Редактор задач</h1>
        <p className="muted">Банк задач по номерам ЕГЭ. Удалённые задачи уходят в архив — статистика учеников не теряется.</p>
      </div>

      <div className="toolbar">
        <select className="select" value={code} onChange={(e) => { setCode(e.target.value); setEditing(null) }}>
          {numbers.map((n) => (
            <option key={n.code} value={n.code}>
              № {n.code} — {n.title} ({n.tasks_count})
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => { setMessage(null); setEditing({ ...EMPTY }) }}>
          + Новая задача в № {code}
        </button>
      </div>

      {message && <p className={message.type === 'error' ? 'error' : 'success'}>{message.text}</p>}

      {editing && (
        <TaskForm
          initial={editing}
          code={code}
          numberTitle={current?.title}
          onCancel={() => setEditing(null)}
          onSaved={saved}
        />
      )}

      {loading && <p className="muted">Загрузка…</p>}
      {!loading && tasks.length === 0 && <div className="empty">В этом номере пока нет задач.</div>}
      {!loading && tasks.length > 0 && (
        <ul className="admin-list">
          {tasks.map((t) => (
            <AdminRow key={t.id} task={t} onEdit={() => openEdit(t.id)} onArchive={() => archive(t)} />
          ))}
        </ul>
      )}
    </section>
  )
}

function AdminRow({ task, onEdit, onArchive }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <li className="admin-list__row">
      <span className="task__id">id {task.id}</span>
      <span className="admin-list__text">{task.statement}</span>
      <span className="badge">{task.difficulty}</span>
      <span className="admin-list__actions">
        {!confirm ? (
          <>
            <button className="btn btn--ghost btn--small" onClick={onEdit}>Изменить</button>
            <button className="btn btn--ghost btn--small" onClick={() => setConfirm(true)}>В архив</button>
          </>
        ) : (
          <>
            <button className="btn btn--danger btn--small" onClick={onArchive}>Да, в архив</button>
            <button className="btn btn--ghost btn--small" onClick={() => setConfirm(false)}>Отмена</button>
          </>
        )}
      </span>
    </li>
  )
}

function TaskForm({ initial, code, numberTitle, onCancel, onSaved }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const isNew = !initial.id

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const data = {
      exam_number: isNew ? code : form.exam_number,
      statement: form.statement.trim(),
      correct_answer: form.correct_answer.trim(),
      explanation: form.explanation.trim(),
      source: form.source,
      source_label: form.source_label.trim() || null,
      difficulty: Number(form.difficulty),
      image_url: form.image_url.trim() || null,
    }
    try {
      const task = isNew ? await createTask(data) : await updateTask(initial.id, data)
      onSaved(isNew ? `Задача id ${task.id} добавлена в № ${task.exam_number}` : `Задача id ${task.id} сохранена`)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <form className="panel admin-form" onSubmit={submit}>
      <h2 className="panel__title">
        {isNew ? `Новая задача · № ${code} ${numberTitle ?? ''}` : `Задача id ${initial.id} · № ${form.exam_number}`}
      </h2>

      <label className="field">
        <span>Условие *</span>
        <textarea rows={5} required value={form.statement} onChange={(e) => set('statement', e.target.value)} />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Правильный ответ *</span>
          <input
            required
            maxLength={100}
            value={form.correct_answer}
            onChange={(e) => set('correct_answer', e.target.value)}
            placeholder="22 · zyxw · 2 20"
          />
          <small className="muted">Несколько чисел — через пробел, порядок важен</small>
        </label>
        <label className="field">
          <span>Сложность (0–100)</span>
          <input type="number" min={0} max={100} value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)} />
        </label>
      </div>

      <label className="field">
        <span>Разбор</span>
        <textarea rows={3} value={form.explanation} onChange={(e) => set('explanation', e.target.value)} />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Источник</span>
          <select className="select" value={form.source} onChange={(e) => set('source', e.target.value)}>
            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Подпись источника</span>
          <input maxLength={100} value={form.source_label} onChange={(e) => set('source_label', e.target.value)} placeholder="Пересдача 08.07.26" />
        </label>
      </div>

      <label className="field">
        <span>Картинка (ссылка)</span>
        <input maxLength={500} value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" />
      </label>

      {error && <p className="error">{error}</p>}
      <div className="admin-form__actions">
        <button className="btn" disabled={saving}>{saving ? 'Сохраняю…' : isNew ? 'Добавить' : 'Сохранить'}</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>Отмена</button>
      </div>
    </form>
  )
}
