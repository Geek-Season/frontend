import { useSearchParams } from 'react-router-dom'

import { tasksWord } from '../HomeworkListPage.jsx'
import { useAdminHomeworks } from '../../queries.js'
import { day } from './format.js'
import HomeworkBuilder from './HomeworkBuilder.jsx'
import HomeworkResults from './HomeworkResults.jsx'

// Вкладка «Домашки»: список → конструктор (черновик или новая) или таблица «кто как сделал».
// Что открыто — в адресе: ?tab=homework&edit=new | edit=5 | results=5 (F5 и «Назад» работают).
export default function HomeworkTab() {
  const [params, setParams] = useSearchParams()
  const edit = params.get('edit')
  const results = params.get('results')
  const open = (next) => setParams({ tab: 'homework', ...next })

  if (edit) {
    return (
      <HomeworkBuilder
        key={edit}
        id={edit === 'new' ? null : Number(edit)}
        onClose={(saved) => open(saved?.sent_at ? { results: String(saved.id) } : {})}
        onSaved={(saved) => edit === 'new' && open({ edit: String(saved.id) })}
      />
    )
  }
  if (results) {
    return <HomeworkResults id={Number(results)} onBack={() => open({})} onEdit={() => open({ edit: results })} />
  }
  return <HomeworkList onOpen={(h) => open(h.sent_at ? { results: String(h.id) } : { edit: String(h.id) })} onNew={() => open({ edit: 'new' })} />
}

function HomeworkList({ onOpen, onNew }) {
  const query = useAdminHomeworks()
  const rows = query.data ?? []

  return (
    <>
      <div className="toolbar hw-admin__toolbar">
        <p className="muted hw-admin__lead">Собранные из банка домашки. Черновик видите только вы; отправленную — выбранные ученики.</p>
        <button className="btn" onClick={onNew}>+ Новая домашка</button>
      </div>

      {query.error && <p className="error">{query.error.message}</p>}
      {query.isPending && <p className="muted">Загрузка…</p>}
      {query.data && rows.length === 0 && <div className="empty">Домашек пока нет.</div>}

      {rows.length > 0 && (
        <table className="admin-users hw-admin__table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Отправлена</th>
              <th className="num">Сдали</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.id} tabIndex={0} onClick={() => onOpen(h)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(h) }}>
                <td>
                  <div className="admin-users__name">{h.title}</div>
                  <div className="muted small">
                    {tasksWord(h.tasks_count)} · {studentsWord(h.students_count)}
                    {h.numbers.length > 0 && <> · {h.numbers.map((c) => `№${c}`).join(', ')}</>}
                  </div>
                </td>
                <td>{h.sent_at ? day(h.sent_at) : <span className="badge">черновик</span>}</td>
                <td className="num mono">{h.sent_at ? `${h.submitted_count}/${h.students_count}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

/** «1 ученик», «2 ученика», «5 учеников» */
export function studentsWord(n) {
  const last = n % 10
  const teen = n % 100 >= 11 && n % 100 <= 14
  if (last === 1 && !teen) return `${n} ученик`
  if (last >= 2 && last <= 4 && !teen) return `${n} ученика`
  return `${n} учеников`
}
