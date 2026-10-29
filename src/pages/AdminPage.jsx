import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'

import {
  archiveTask,
  createTask,
  deleteTaskFile,
  fileUrl,
  getNumberTasks,
  getNumbers,
  getTaskFull,
  updateTask,
  uploadTaskFile,
} from '../api.js'
import { useAuth } from '../auth.jsx'
import { fileIcon, formatSize } from '../components/TaskMedia.jsx'

const EMPTY = {
  statement: '',
  correct_answer: '',
  explanation: '',
  source: 'author',
  source_label: '',
  difficulty: 50,
  image_url: '',
}

// Номер, где задача = общее условие игры + три вопроса со своими ответами.
const PART_NUMBERS = { '19-21': ['19', '20', '21'] }
const emptyParts = (numbers) => numbers.map((number) => ({ number, question: '', correct_answer: '', explanation: '' }))

// Картинки и файлы к задаче. Те же ограничения проверяет сервер — здесь они,
// чтобы сразу подсказать, а не после нажатия «Сохранить».
const FILE_KINDS = {
  image: {
    title: 'Картинки',
    hint: 'PNG, JPEG, GIF или WebP до 5 МБ. Показываются ученику под условием. Скриншот можно вставить через Ctrl+V.',
    accept: 'image/png,image/jpeg,image/gif,image/webp',
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
    maxMb: 5,
    add: '+ Добавить картинку',
  },
  attachment: {
    title: 'Файлы к заданию',
    hint: 'xlsx, xls, ods, csv, txt, docx, doc, odt, pdf, zip до 20 МБ. Ученик скачивает их, как на ЕГЭ (номера 3, 9, 10, 17, 18, 22, 24, 26, 27).',
    accept: '.xlsx,.xls,.ods,.csv,.txt,.docx,.doc,.odt,.pdf,.zip',
    extensions: ['xlsx', 'xls', 'ods', 'csv', 'txt', 'docx', 'doc', 'odt', 'pdf', 'zip'],
    maxMb: 20,
    add: '+ Добавить файл',
  },
}
const MAX_FILES_PER_KIND = 10

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
    try {
      await archiveTask(task.id)
      setMessage({ type: 'ok', text: `Задача id ${task.id} убрана в архив` })
      setReload((r) => r + 1)
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  function saved(text, failures = []) {
    setEditing(null)
    setMessage(
      failures.length
        ? { type: 'error', text: `${text}, но с файлами не всё получилось: ${failures.join('; ')}` }
        : { type: 'ok', text },
    )
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
      <span className="admin-list__files muted small" title="Картинки · файлы к заданию">
        {task.images?.length > 0 && `🖼 ${task.images.length} `}
        {task.attachments?.length > 0 && `📎 ${task.attachments.length}`}
      </span>
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
  const numberCode = isNew ? code : form.exam_number
  const partNumbers = PART_NUMBERS[numberCode]
  const [parts, setParts] = useState(() =>
    partNumbers ? (initial.parts?.length ? initial.parts.map((p) => ({ ...p })) : emptyParts(partNumbers)) : [],
  )

  // Файлы: уже прикреплённые (с сервера), отмеченные на удаление и новые, ещё не загруженные.
  // Всё применяется по кнопке «Сохранить» — до неё можно передумать.
  const existing = { image: initial.images ?? [], attachment: initial.attachments ?? [] }
  const [removed, setRemoved] = useState(() => new Set())
  const [pending, setPending] = useState([]) // [{ key, file, kind, preview }]
  const [fileError, setFileError] = useState(null)
  const pendingRef = useRef(pending)
  pendingRef.current = pending

  // Превью новых картинок — временные адреса в памяти браузера; освобождаем при закрытии формы.
  useEffect(() => () => pendingRef.current.forEach((p) => p.preview && URL.revokeObjectURL(p.preview)), [])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function addFiles(fileList, kind) {
    const rules = FILE_KINDS[kind]
    const problems = []
    const accepted = []
    const already = existing[kind].filter((f) => !removed.has(f.id)).length + pending.filter((p) => p.kind === kind).length
    for (const file of fileList) {
      const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
      if (!rules.extensions.includes(ext)) problems.push(`«${file.name}» — неподходящий тип`)
      else if (file.size === 0) problems.push(`«${file.name}» — пустой файл`)
      else if (file.size > rules.maxMb * 1024 * 1024) problems.push(`«${file.name}» больше ${rules.maxMb} МБ`)
      else if (already + accepted.length >= MAX_FILES_PER_KIND) problems.push(`«${file.name}» — не больше ${MAX_FILES_PER_KIND} шт.`)
      else accepted.push({
        key: `${Date.now()}-${Math.random()}`,
        file,
        kind,
        preview: kind === 'image' ? URL.createObjectURL(file) : null,
      })
    }
    setFileError(problems.length ? problems.join('; ') : null)
    if (accepted.length) setPending((list) => [...list, ...accepted])
  }

  function dropPending(key) {
    setPending((list) => {
      const item = list.find((p) => p.key === key)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return list.filter((p) => p.key !== key)
    })
  }

  function toggleRemoved(id) {
    setRemoved((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Ctrl+V со скриншотом в любом месте формы — добавляем как картинку.
  function handlePaste(event) {
    const images = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return
    event.preventDefault()
    addFiles(images.map((f, i) => (f.name && f.name !== 'image.png' ? f : renamed(f, i))), 'image')
  }

  function setPart(index, field, value) {
    setParts((list) => list.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const data = {
      exam_number: numberCode,
      statement: form.statement.trim(),
      explanation: form.explanation.trim(),
      source: form.source,
      source_label: form.source_label.trim() || null,
      difficulty: Number(form.difficulty),
      image_url: form.image_url.trim() || null,
    }
    if (partNumbers) {
      // Ответ задачи 19–21 сервер соберёт сам из ответов частей.
      data.parts = parts.map((p) => ({
        number: p.number,
        question: p.question.trim(),
        correct_answer: p.correct_answer.trim(),
        explanation: (p.explanation ?? '').trim(),
      }))
    } else {
      data.correct_answer = form.correct_answer.trim()
    }
    let task
    try {
      task = isNew ? await createTask(data) : await updateTask(initial.id, data)
    } catch (e) {
      setError(e.message)
      setSaving(false)
      return
    }

    // Задача сохранена — теперь файлы: сначала удаляем отмеченные, потом загружаем новые.
    const failures = []
    for (const id of removed) {
      try {
        await deleteTaskFile(task.id, id)
      } catch (e) {
        failures.push(`не удалился файл id ${id}: ${e.message}`)
      }
    }
    for (const item of pending) {
      try {
        await uploadTaskFile(task.id, item.file, item.kind)
      } catch (e) {
        failures.push(`«${item.file.name}»: ${e.message}`)
      }
    }
    onSaved(
      isNew ? `Задача id ${task.id} добавлена в № ${task.exam_number}` : `Задача id ${task.id} сохранена`,
      failures,
    )
  }

  return (
    <form className="panel admin-form" onSubmit={submit} onPaste={handlePaste}>
      <h2 className="panel__title">
        {isNew ? `Новая задача · № ${code} ${numberTitle ?? ''}` : `Задача id ${initial.id} · № ${form.exam_number}`}
      </h2>

      <label className="field">
        <span>{partNumbers ? 'Условие игры (общее для 19, 20, 21) *' : 'Условие *'}</span>
        <textarea rows={5} required value={form.statement} onChange={(e) => set('statement', e.target.value)} />
      </label>

      {partNumbers && parts.map((p, index) => (
        <fieldset key={p.number} className="admin-part">
          <legend>Задание {p.number}</legend>
          <label className="field">
            <span>Вопрос *</span>
            <textarea rows={3} required value={p.question} onChange={(e) => setPart(index, 'question', e.target.value)} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Ответ *</span>
              <input required maxLength={100} value={p.correct_answer} onChange={(e) => setPart(index, 'correct_answer', e.target.value)} placeholder="28 48" />
            </label>
            <label className="field">
              <span>Разбор</span>
              <input value={p.explanation ?? ''} onChange={(e) => setPart(index, 'explanation', e.target.value)} />
            </label>
          </div>
        </fieldset>
      ))}

      <div className="field-row">
        {!partNumbers && (
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
        )}
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

      {Object.keys(FILE_KINDS).map((kind) => (
        <FilesField
          key={kind}
          kind={kind}
          existing={existing[kind]}
          removed={removed}
          pending={pending.filter((p) => p.kind === kind)}
          onAdd={(files) => addFiles(files, kind)}
          onToggleRemoved={toggleRemoved}
          onDropPending={dropPending}
          disabled={saving}
        />
      ))}
      {fileError && <p className="error small">{fileError}</p>}

      <details className="admin-form__legacy" open={Boolean(form.image_url)}>
        <summary className="muted small">Картинка по внешней ссылке</summary>
        <label className="field">
          <span>Ссылка на картинку (лучше загрузить файл выше — ссылки из интернета пропадают)</span>
          <input maxLength={500} value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" />
        </label>
      </details>

      {error && <p className="error">{error}</p>}
      <div className="admin-form__actions">
        <button className="btn" disabled={saving}>{saving ? 'Сохраняю…' : isNew ? 'Добавить' : 'Сохранить'}</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>Отмена</button>
      </div>
    </form>
  )
}

// Блок «Картинки» или «Файлы к заданию» в форме: что уже прикреплено, что добавится.
function FilesField({ kind, existing, removed, pending, onAdd, onToggleRemoved, onDropPending, disabled }) {
  const rules = FILE_KINDS[kind]
  const input = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (!disabled) onAdd([...event.dataTransfer.files])
  }

  const empty = existing.length === 0 && pending.length === 0

  return (
    <fieldset
      className={`admin-files ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <legend>{rules.title}</legend>
      <p className="muted small admin-files__hint">{rules.hint}</p>

      {!empty && (
        <ul className={`admin-files__list admin-files__list--${kind}`}>
          {existing.map((f) => {
            const isRemoved = removed.has(f.id)
            return (
              <li key={f.id} className={`admin-file ${isRemoved ? 'is-removed' : ''}`}>
                {kind === 'image'
                  ? <img src={fileUrl(f)} alt="" className="admin-file__thumb" />
                  : <span className="admin-file__icon" aria-hidden="true">{fileIcon(f.name)}</span>}
                <a href={fileUrl(f)} target="_blank" rel="noreferrer" className="admin-file__name">{f.name}</a>
                <span className="muted small">{isRemoved ? 'удалится при сохранении' : formatSize(f.size)}</span>
                <button type="button" className="btn btn--ghost btn--small" onClick={() => onToggleRemoved(f.id)} disabled={disabled}>
                  {isRemoved ? 'Вернуть' : 'Удалить'}
                </button>
              </li>
            )
          })}
          {pending.map((p) => (
            <li key={p.key} className="admin-file is-new">
              {p.preview
                ? <img src={p.preview} alt="" className="admin-file__thumb" />
                : <span className="admin-file__icon" aria-hidden="true">{fileIcon(p.file.name)}</span>}
              <span className="admin-file__name">{p.file.name}</span>
              <span className="muted small">новый · {formatSize(p.file.size)}</span>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => onDropPending(p.key)} disabled={disabled}>
                Убрать
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="admin-files__actions">
        <button type="button" className="btn btn--ghost btn--small" onClick={() => input.current?.click()} disabled={disabled}>
          {rules.add}
        </button>
        <span className="muted small">или перетащите сюда</span>
        <input
          ref={input}
          type="file"
          accept={rules.accept}
          multiple
          hidden
          onChange={(e) => {
            onAdd([...e.target.files])
            e.target.value = '' // чтобы тот же файл можно было выбрать ещё раз
          }}
        />
      </div>
    </fieldset>
  )
}

// Скриншоты из буфера обмена все называются image.png — даём понятные имена.
function renamed(file, index) {
  const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
  return new File([file], `скриншот-${stamp}${index ? `-${index + 1}` : ''}.${ext}`, { type: file.type })
}
