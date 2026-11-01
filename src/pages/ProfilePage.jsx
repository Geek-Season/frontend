import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { displayName, useAuth } from '../auth.jsx'
import ActivityCalendar from '../components/ActivityCalendar.jsx'
import Avatar from '../components/Avatar.jsx'
import ProfileSettings from '../components/ProfileSettings.jsx'
import RankMedal from '../components/RankMedal.jsx'
import { useAchievements, useMyRank, useStats } from '../queries.js'

// «Занимаюсь с января 2026»: месяц в родительном падеже.
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа',
  'сентября', 'октября', 'ноября', 'декабря']

function sinceText(iso) {
  const date = new Date(iso)
  return `Занимаюсь с ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export default function ProfilePage() {
  const { user, checking, logout } = useAuth()
  // Из кэша: после ответа на задачу статистика помечена устаревшей и тихо обновится в фоне.
  const statsQuery = useStats()
  const stats = statsQuery.data ?? null
  const error = stats ? null : statsQuery.error?.message
  // Достижения выдаёт фоновый воркер через RabbitMQ — обычно за секунду после ответа.
  const achievements = useAchievements().data ?? []
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (checking) return <p className="muted">Загрузка…</p>
  if (!user) return <Navigate to="/login" replace />


  return (
    <section>
      <div className="profile">
        <Avatar name={displayName(user)} url={user.avatar_url} />
        <div className="profile__info">
          <h1>{displayName(user)}</h1>
          {user.username && <p className="muted">@{user.username}</p>}
          <p className="muted small">{sinceText(user.created_at)}</p>
        </div>
        <div className="profile__actions">
          {user.role === 'admin' && <Link to="/admin" className="btn btn--ghost">Админка</Link>}
          <button className="btn btn--ghost" onClick={logout}>Выйти</button>
          <button className="btn btn--ghost btn--icon" onClick={() => setSettingsOpen(true)} aria-label="Настройки профиля" title="Настройки профиля">
            <GearIcon />
          </button>
        </div>
      </div>

      {settingsOpen && <ProfileSettings onClose={() => setSettingsOpen(false)} />}

      <RankCard />

      {error && <p className="error">Не удалось загрузить статистику: {error}</p>}
      {!stats && !error && <p className="muted">Загрузка статистики…</p>}
      {stats && (stats.total_attempts === 0 ? <EmptyStats /> : <Stats stats={stats} />)}
      {achievements.length > 0 && <Achievements items={achievements} />}
    </section>
  )
}

// Ник виден всем: в рейтинге и шапке сайта. Имя и @username из Telegram видит только сам ученик.
function EmptyStats() {
  return (
    <div className="placeholder">
      <p>Вы ещё не решали задачи. Здесь появятся календарь занятий, номера, которые стоит повторить, и последние ответы.</p>
      <Link to="/" className="btn">Решать задания</Link>
    </div>
  )
}

function Stats({ stats }) {
  return (
    <>
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
        <h2 className="panel__title">Активность</h2>
        <ActivityCalendar calendar={stats.calendar} />
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

function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// Карточка ранга: ранг, прогноз балла, PTS и сколько до следующего ранга.
// PTS и прогноз видит только сам ученик; другим в рейтинге виден только ранг.
function RankCard() {
  const { data: info } = useMyRank()
  const navigate = useNavigate()
  if (!info) return null

  if (!info.calibrated) {
    return (
      <div className="rank-card rank-card--locked">
        <RankMedal locked size={96} />
        <div className="rank-card__body">
          <p className="rank-card__title">Ранг не определён</p>
          <p className="rank-card__sub">
            Пройдите входной пробник — по нему определим ваш уровень и первый ранг.
            PTS за задачи начисляются уже сейчас: <span className="rank-card__pts">{Math.round(info.pts)} PTS</span>
          </p>
          <button className="btn" onClick={() => navigate('/exam')}>Пройти входной пробник</button>
        </div>
      </div>
    )
  }

  const min = info.rank_min_primary
  const next = info.next_min_primary // null — уже Immortal
  const slots = next ? Math.min(5, next - min) : 0
  const inRank = Math.max(0, info.forecast_primary - min)
  const progress = next ? Math.min(1, (info.forecast_primary - min + 0.5) / (next - min)) : 1
  const left = next ? Math.max(1, next - info.forecast_primary) : 0

  return (
    <div className="rank-card">
      <RankMedal rank={info.rank} size={104} stars={Math.min(slots, inRank + 1)} slots={slots} />
      <div className="rank-card__body">
        <p className="rank-card__title">
          {info.rank.title}
          {info.immortal_place && <b className="lb__imm"> #{info.immortal_place}</b>}
        </p>
        <p className="rank-card__sub">
          Прогноз на ЕГЭ: <b>{info.forecast_test} {scoreWord(info.forecast_test)}</b> ({info.forecast_primary} перв.){' '}
          · <span className="rank-card__pts">{Math.round(info.pts)} PTS</span>
        </p>
        <div className="rank-card__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="rank-card__row">
          <span>{next ? `ещё ${left} ${primaryWord(left)} до ранга «${info.next_rank.title}»` : 'Высший ранг'}</span>
          <span>Другие видят только ранг</span>
        </div>
      </div>
    </div>
  )
}

function scoreWord(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'балл'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'балла'
  return 'баллов'
}

function primaryWord(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'первичный балл'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'первичных балла'
  return 'первичных баллов'
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}
