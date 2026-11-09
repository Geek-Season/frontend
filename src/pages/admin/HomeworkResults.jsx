import { useState } from 'react'

import Avatar from '../../components/Avatar.jsx'
import { useHomeworkResults } from '../../queries.js'
import { day, moment } from './format.js'

// Таблица «ученик × задача»: зелёная — верно, красная — ошибся, серая — не отвечал.
// Клик по клетке — что именно ответил ученик.
export default function HomeworkResults({ id, onBack, onEdit }) {
  const query = useHomeworkResults(id)
  const [cell, setCell] = useState(null) // { row, index }

  if (query.error) return <p className="error">{query.error.message}</p>
  if (query.isPending) return <p className="muted">Загрузка…</p>
  const hw = query.data
  const picked = cell && hw.rows[cell.row]
  const pickedAnswer = picked?.cells[cell.index]

  return (
    <div className="hw-results">
      <div className="toolbar hw-results__bar">
        <button type="button" className="btn btn--ghost btn--small" onClick={onBack}>← Все домашки</button>
        <span className="hw-builder__spacer" />
        <button type="button" className="btn btn--ghost btn--small" onClick={onEdit}>Изменить · добавить учеников</button>
      </div>
      <h2 className="hw-builder__title">{hw.title}</h2>
      <p className="muted small">
        Отправлена {day(hw.sent_at)} · сдали {hw.rows.filter((r) => r.submitted_at).length} из {hw.rows.length} ·
        ✓ верно, ✕ ошибся, – пропустил и сдал (неверно), · ещё не отвечал
      </p>

      <div className="hw-matrix__wrap">
        <table className="admin-users hw-matrix">
          <thead>
            <tr>
              <th>Ученик</th>
              {hw.tasks.map((t) => <th key={t.position} className="hw-matrix__col" title={`№${t.exam_number} · задача #${t.task_id}`}>{t.position}</th>)}
              <th className="num">Итог</th>
            </tr>
          </thead>
          <tbody>
            {hw.rows.map((r, rowIndex) => (
              <tr key={r.student.id}>
                <td>
                  <span className="admin-users__who">
                    <Avatar name={r.student.display_name} url={r.student.avatar_url} size="small" />
                    <span className="admin-users__name">{r.student.display_name}</span>
                  </span>
                </td>
                {r.cells.map((c, i) => {
                  const mark = markOf(c, Boolean(r.submitted_at))
                  return (
                    <td key={i} className="hw-matrix__col">
                      <button
                        type="button"
                        className={`hw-mark hw-mark--${mark.kind} ${cell?.row === rowIndex && cell?.index === i ? 'is-picked' : ''}`}
                        onClick={() => setCell({ row: rowIndex, index: i })}
                        aria-label={`${r.student.display_name}, задача ${i + 1}: ${mark.label}`}
                      >
                        {mark.sign}
                      </button>
                    </td>
                  )
                })}
                <td className="num">
                  <Status row={r} total={hw.tasks.length} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {picked && (
        <div className="verdict verdict--solution hw-results__cell">
          <strong>{picked.student.display_name} · задача {cell.index + 1} (№{hw.tasks[cell.index].exam_number}, #{hw.tasks[cell.index].task_id})</strong>
          <div>
            {pickedAnswer ? (
              <>
                Ответ: <code>{pickedAnswer.answer}</code> — {pickedAnswer.is_correct ? <span className="success">верно</span> : <span className="error">неверно</span>}
                <span className="muted small"> · {moment(pickedAnswer.answered_at)} · попытка одна</span>
              </>
            ) : (
              <span className="muted">{picked.submitted_at ? 'Без ответа — засчитано как неверное.' : 'Ещё не отвечал.'}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Клетка: верно, ошибся, пропустил и сдал (засчитано неверным) или ещё не отвечал. */
function markOf(cell, submitted) {
  if (cell) return cell.is_correct ? { kind: 'ok', sign: '✓', label: 'верно' } : { kind: 'bad', sign: '✕', label: 'неверно' }
  return submitted ? { kind: 'skipped', sign: '–', label: 'пропустил — неверно' } : { kind: 'none', sign: '·', label: 'нет ответа' }
}

function Status({ row, total }) {
  if (row.submitted_at) return <span className="badge badge--status-solved" title={`Сдал ${moment(row.submitted_at)}`}>{row.correct}/{total}</span>
  if (row.answered === 0) return <span className="badge hw-badge--new">не начал</span>
  return <span className="badge badge--demo" title="Решает, ещё не сдал">{row.correct}/{total} · решает</span>
}
