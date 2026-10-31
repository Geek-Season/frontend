import { useEffect, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import {
  archiveTask,
  createTask,
  deleteTaskFile,
  fileUrl,
  getTaskFull,
  updateTask,
  uploadTaskFile,
} from '../api.js'
import { useAuth } from '../auth.jsx'
import { plainText } from '../components/Markdown.jsx'
import MarkdownEditor, { replaceImageSources } from '../components/MarkdownEditor.jsx'
import { fileIcon, formatSize } from '../components/TaskMedia.jsx'
import { useAdminTasks, useInvalidate, useNumbers } from '../queries.js'
import JournalTab from './admin/JournalTab.jsx'
import UsersTab from './admin/UsersTab.jsx'

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
    hint: 'PNG, JPEG, GIF или WebP до 5 МБ. Вставить в нужное место текста — кнопка 🖼 в редакторе или Ctrl+V прямо в поле. Не вставленные в текст показываются под условием.',
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
  { value: 'approbation', label: 'Апробация' },
]

const TABS = [
  { key: 'tasks', title: 'Задачи' },
  { key: 'users', title: 'Ученики' },
  { key: 'log', title: 'Журнал' },
]

// /admin — админка: редактор банка задач, ученики, журнал действий админов.
// Вкладка — в адресе (?tab=users): отдельные страницы на GitHub Pages не нужны, F5 не сбрасывает вкладку.
// Только для роли admin (сервер всё равно проверит сам).
export default function AdminPage() {
  const { user, checking } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'tasks'

  if (checking) return <p className="muted">Загрузка…</p>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') {
    return (
      <div className="placeholder">
        <h1>Админка</h1>
        <p>Только для администратора.</p>
      </div>
    )
  }

  return (
    <section>
      <div className="page-head">
        <h1>Админка</h1>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`tabs__tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setParams(t.key === 'tasks' ? {} : { tab: t.key })}
          >
            {t.title}
          </button>
        ))}
      </div>
      {tab === 'tasks' && <TasksTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'log' && <JournalTab />}
    </section>
  )
}

function TasksTab() {
  const { user } = useAuth()
  const [code, setCode] = useState('1')
  const [editing, setEditing] = useState(null) // null — форма закрыта, {id?, ...поля} — открыта
  const [message, setMessage] = useState(null)
  const isAdmin = user?.role === 'admin'

  const numbers = useNumbers().data ?? []
  const tasksQuery = useAdminTasks(code, isAdmin)
  const tasks = tasksQuery.data ?? []
  const loading = isAdmin && tasksQuery.isPending
  // Банк изменился — номера и задачи устарели у всех страниц сайта (и у учеников при следующем заходе).
  const invalidate = useInvalidate()
  const reload = () => invalidate.bankChanged()

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
      reload()
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
    reload()
  }

  const current = numbers.find((n) => n.code === code)

  return (
    <>
      <p className="muted">Банк задач по номерам ЕГЭ. Удалённые задачи уходят в архив — статистика учеников не теряется.</p>

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
      {tasksQuery.error && <p className="error">{tasksQuery.error.message}</p>}

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
    </>
  )
}

function AdminRow({ task, onEdit, onArchive }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <li className="admin-list__row">
      <span className="task__id">id {task.id}</span>
      <span className="admin-list__text">{plainText(task.statement)}</span>
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
        key: Math.random().toString(36).slice(2, 10), // короткий: виден в тексте как ![](pending:…)
        file,
        kind,
        preview: kind === 'image' ? URL.createObjectURL(file) : null,
      })
    }
    setFileError(problems.length ? problems.join('; ') : null)
    if (accepted.length) setPending((list) => [...list, ...accepted])
    return accepted
  }

  // ---------- Картинки в тексте (Markdown) ----------

  // Что можно вставить в текст: уже загруженные (кроме отмеченных на удаление) и новые.
  const insertable = [
    ...existing.image.filter((f) => !removed.has(f.id)).map((f) => ({ src: f.url, name: f.name, preview: fileUrl(f) })),
    ...pending.filter((p) => p.kind === 'image').map((p) => ({ src: `pending:${p.key}`, name: p.file.name, preview: p.preview })),
  ]
  // Картинка, вставленная из редактора (кнопка 🖼, Ctrl+V, перетаскивание), — новая картинка задачи.
  const addImagesFromEditor = (files) =>
    addFiles(files.map((f, i) => (f.name && f.name !== 'image.png' ? f : renamed(f, i))), 'image').map((p) => `pending:${p.key}`)
  const resolveImage = (src) => pending.find((p) => `pending:${p.key}` === src)?.preview
  const editorProps = { images: insertable, onAddImages: addImagesFromEditor, resolveImage, disabled: saving }

  /** Все тексты задачи с подменой адресов картинок (см. replaceImageSources). */
  function withImages(data, replacements) {
    const fix = (text) => replaceImageSources(text, replacements)
    const out = { ...data, statement: fix(data.statement), explanation: fix(data.explanation) }
    if (data.parts) out.parts = data.parts.map((p) => ({ ...p, question: fix(p.question), explanation: fix(p.explanation) }))
    return out
  }

  /** Адреса картинок, которых не будет: удалённые файлы и убранные из списка новые. */
  function goneImages(data) {
    const gone = {}
    for (const f of existing.image) if (removed.has(f.id)) gone[f.url] = null
    const texts = [data.statement, data.explanation, ...(data.parts ?? []).flatMap((p) => [p.question, p.explanation])]
    for (const match of texts.join('\n').matchAll(/\]\((pending:[^)\s]+)\)/g)) {
      if (!pending.some((p) => `pending:${p.key}` === match[1])) gone[match[1]] = null
    }
    return gone
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
    const saved = withImages(data, goneImages(data))
    try {
      task = isNew ? await createTask(saved) : await updateTask(initial.id, saved)
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
    const uploaded = {} // pending:… → /files/… (или null, если не загрузилась)
    for (const item of pending) {
      try {
        const file = await uploadTaskFile(task.id, item.file, item.kind)
        uploaded[`pending:${item.key}`] = file.url
      } catch (e) {
        uploaded[`pending:${item.key}`] = null
        failures.push(`«${item.file.name}»: ${e.message}`)
      }
    }
    // Вставленные в текст новые картинки получили адреса — подставляем их вместо заглушек.
    const final = withImages(saved, uploaded)
    const changed = ['statement', 'explanation'].filter((k) => final[k] !== saved[k])
    const partsChanged = saved.parts && JSON.stringify(final.parts) !== JSON.stringify(saved.parts)
    if (changed.length || partsChanged) {
      const patch = Object.fromEntries(changed.map((k) => [k, final[k]]))
      if (partsChanged) patch.parts = final.parts
      try {
        await updateTask(task.id, patch)
      } catch (e) {
        failures.push(`не удалось вставить картинки в текст: ${e.message}`)
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

      <MarkdownEditor
        label={partNumbers ? 'Условие игры (общее для 19, 20, 21)' : 'Условие'}
        required
        rows={8}
        value={form.statement}
        onChange={(v) => set('statement', v)}
        {...editorProps}
      />

      {partNumbers && parts.map((p, index) => (
        <fieldset key={p.number} className="admin-part">
          <legend>Задание {p.number}</legend>
          <MarkdownEditor label="Вопрос" required rows={3} value={p.question}
            onChange={(v) => setPart(index, 'question', v)} {...editorProps} />
          <label className="field">
            <span>Ответ *</span>
            <input required maxLength={100} value={p.correct_answer} onChange={(e) => setPart(index, 'correct_answer', e.target.value)} placeholder="28 48" />
          </label>
          <MarkdownEditor label={`Разбор ${p.number}`} rows={2} value={p.explanation ?? ''}
            onChange={(v) => setPart(index, 'explanation', v)} {...editorProps} />
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

      <MarkdownEditor
        label="Разбор (виден ученику после ответа)"
        rows={4}
        value={form.explanation}
        onChange={(v) => set('explanation', v)}
        {...editorProps}
      />

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
