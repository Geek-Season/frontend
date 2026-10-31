import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { updateNickname } from '../api.js'
import { displayName, useAuth } from '../auth.jsx'
import ActivityChart from '../components/ActivityChart.jsx'
import { useAchievements, useStats } from '../queries.js'

const NICK_MIN = 3
const NICK_MAX = 20

export default function ProfilePage() {
  const { user, checking, logout } = useAuth()
  // Из кэша: после ответа на задачу статистика помечена устаревшей и тихо обновится в фоне.
  const statsQuery = useStats()
  const stats = statsQuery.data ?? null
  const error = stats ? null : statsQuery.error?.message
  // Достижения выдаёт фоновый воркер через RabbitMQ — обычно за секунду после ответа.
  const achievements = useAchievements().data ?? []

  if (checking) return <p className="muted">Загрузка…</p>
  if (!user) return <Navigate to="/login" replace />

  const telegramName = [user.first_name, user.last_name].filter(Boolean).join(' ')
  const joined = new Date(user.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <section>
      <div className="profile">
        <div className="avatar">{displayName(user).slice(0, 1).toUpperCase()}</div>
        <div className="profile__info">
          <h1>{displayName(user)}</h1>
          <p className="muted">
            {user.nickname ? `В Telegram: ${telegramName}` : telegramName}
            {user.username && <> · @{user.username}</>}
          </p>
          <p className="muted small">На сайте с {joined}</p>
        </div>
        <div className="profile__actions">
          {user.role === 'admin' && <Link to="/admin" className="btn btn--ghost">Редактор задач</Link>}
          <button className="btn btn--ghost" onClick={logout}>Выйти</button>
        </div>
      </div>

      <NicknameForm user={user} />

      {error && <p className="error">Не удалось загрузить статистику: {error}</p>}
      {!stats && !error && <p className="muted">Загрузка статистики…</p>}
      {stats && (stats.total_attempts === 0 ? <EmptyStats /> : <Stats stats={stats} />)}
      {achievements.length > 0 && <Achievements items={achievements} />}
    </section>
  )
}

// Ник виден всем: в рейтинге и шапке сайта. Имя и @username из Telegram видит только сам ученик.
function NicknameForm({ user }) {
  const { updateUser } = useAuth()
  const queryClient = useQueryClient()
  const [value, setValue] = useState(user.nickname ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null) // { ok: bool, text }

  const trimmed = value.trim()
  const localError = !trimmed
    ? null
    : trimmed.length < NICK_MIN || trimmed.length > NICK_MAX
      ? `От ${NICK_MIN} до ${NICK_MAX} символов`
      : !/^[\p{L}\p{N}_-]+$/u.test(trimmed)
        ? 'Только буквы, цифры, «_» и «-»'
        : null
  const unchanged = trimmed === (user.nickname ?? '')

  async function save(nickname) {
    setSaving(true)
    setMessage(null)
    try {
      const me = await updateNickname(nickname)
      updateUser(me)
      setValue(me.nickname ?? '')
      setMessage({ ok: true, text: me.nickname ? 'Ник сохранён' : 'Ник убран — показываем имя из Telegram' })
      queryClient.invalidateQueries({ queryKey: ['rating'] }) // в рейтинге — новое имя
    } catch (e) {
      setMessage({ ok: false, text: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="panel nickname"
      onSubmit={(e) => {
        e.preventDefault()
        if (!localError && !unchanged) save(trimmed || null)
      }}
    >
      <h2 className="panel__title">Ник на сайте</h2>
      <p className="muted small panel__hint">
        Ник видят все в рейтинге и вверху сайта. Без ника показываем имя из Telegram ({user.first_name}).
      </p>
      <div className="nickname__row">
        <input
          className="nickname__input"
          value={value}
          onChange={(e) => { setValue(e.target.value); setMessage(null) }}
          placeholder="например, kotik_42"
          maxLength={NICK_MAX + 10}
          aria-label="Ник"
          autoComplete="off"
        />
        <button className="btn" disabled={saving || Boolean(localError) || unchanged}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
        {user.nickname && (
          <button type="button" className="btn btn--ghost" disabled={saving} onClick={() => save(null)}>
            Убрать ник
          </button>
        )}
      </div>
      <p className={`small nickname__note ${localError || message?.ok === false ? 'error' : message ? 'success' : 'muted'}`}>
        {localError || message?.text || `${NICK_MIN}–${NICK_MAX} символов: буквы, цифры, «_» и «-».`}
      </p>
    </form>
  )
}

function EmptyStats() {
  return (
    <div className="placeholder">
      <p>Вы ещё не решали задачи. Здесь появится статистика: решённые задачи, точность и прогресс по номерам.</p>
      <Link to="/" className="btn">Решать задания</Link>
    </div>
  )
}

function Stats({ stats }) {
  const accuracy = stats.accuracy === null ? '—' : `${Math.round(stats.accuracy * 100)}%`
  const started = stats.by_number.filter((n) => n.tasks_count > 0)

  return (
    <>
      <div className="tiles">
        <Tile label="Решено задач" value={stats.solved_tasks} hint={`из ${stats.total_tasks} в банке`} />
        <Tile
          label="Точность"
          value={accuracy}
          hint={`${stats.correct_attempts} верных из ${stats.total_attempts}`}
        />
        <Tile label="Серия" value={dayWord(stats.streak_days)} hint="подряд без пропусков" />
        <Tile label="Всего ответов" value={stats.total_attempts} hint={`за ${dayWord(stats.active_days)}`} />
      </div>

      {stats.weak_numbers.length > 0 && (
        <div className="panel panel--weak">
          <h2 className="panel__title">Что повторить</h2>
          <p className="muted small panel__hint">
            Номера, где есть нерешённые задачи или точность ниже 60%. Сначала — самые проблемные.
          </p>
          <ul className="weak">
            {stats.weak_numbers.map((w) => (
              <li key={w.code} className="weak__row">
                <span className="number-progress__code">{w.code}</span>
                <span className="weak__title">{w.title}</span>
                <span className="weak__facts small">
                  точность {Math.round(w.accuracy * 100)}%
                  {w.unsolved_tasks > 0 && ` · не решено: ${w.unsolved_tasks}`}
                </span>
                <Link
                  to={`/tasks/${w.code}${w.unsolved_tasks > 0 ? '?progress=unsolved' : ''}`}
                  className="btn btn--small"
                >
                  Потренировать
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <h2 className="panel__title">Ответы за 14 дней</h2>
        <ActivityChart days={stats.activity} />
      </div>

      <div className="panel">
        <h2 className="panel__title">Прогресс по номерам</h2>
        <div className="number-progress">
          {started.map((n) => (
            <Link key={n.code} to={`/tasks/${n.code}`} className="number-progress__row">
              <span className="number-progress__code">{n.code}</span>
              <span className="number-progress__title">{n.title}</span>
              <span className="progress progress--wide">
                <span style={{ width: `${(n.solved / n.tasks_count) * 100}%` }} />
              </span>
              <span className="number-progress__value">{n.solved} / {n.tasks_count}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">Последние ответы</h2>
        <ul className="recent">
          {stats.recent.map((a, i) => (
            <li key={i} className="recent__row">
              <span className={`recent__mark ${a.is_correct ? 'ok' : 'bad'}`}>
                {a.is_correct ? '✓ верно' : '✗ неверно'}
              </span>
              <Link to={`/tasks/${a.exam_number}`} className="recent__task">
                № {a.exam_number} · задача {a.task_id}
              </Link>
              <code className="recent__answer">{a.answer}</code>
              <span className="muted small">{timeAgo(a.created_at)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function Achievements({ items }) {
  const received = items.filter((a) => a.received_at).length
  return (
    <div className="panel">
      <h2 className="panel__title">
        Достижения <span className="muted small">· {received} из {items.length}</span>
      </h2>
      <ul className="achievements">
        {items.map((a) => (
          <li key={a.code} className={`achievement ${a.received_at ? 'is-received' : 'is-locked'}`}>
            <span className="achievement__icon" aria-hidden="true">{a.received_at ? a.icon : '🔒'}</span>
            <span className="achievement__body">
              <strong>{a.title}</strong>
              <span className="muted small">{a.description}</span>
              {a.received_at && (
                <span className="achievement__date small">
                  получено {new Date(a.received_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Tile({ label, value, hint }) {
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <span className="tile__value">{value}</span>
      <span className="tile__hint">{hint}</span>
    </div>
  )
}

function plural(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function dayWord(n) {
  return `${n} ${plural(n, 'день', 'дня', 'дней')}`
}

function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
