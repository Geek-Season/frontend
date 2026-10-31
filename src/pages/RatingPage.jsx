import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { resetNickname } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useRating } from '../queries.js'

const PERIODS = [
  { value: 'week', label: 'Эта неделя' },
  { value: 'all', label: 'Всё время' },
]

// /rating — таблица лидеров. Очко — за каждую задачу, решённую впервые.
export default function RatingPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('week')
  // Обе вкладки («Эта неделя», «Всё время») кэшируются отдельно: переключение — мгновенное.
  const ratingQuery = useRating(period)
  const rating = ratingQuery.data ?? null
  const error = rating ? null : ratingQuery.error?.message

  const meInTop = rating?.top.some((r) => r.is_me)
  const isAdmin = user?.role === 'admin'
  const queryClient = useQueryClient()
  const [resetError, setResetError] = useState(null)

  // Админ: сбросить неприличный ник — ученик снова будет под именем из Telegram.
  async function handleReset(row) {
    if (!window.confirm(`Сбросить ник «${row.name}»? Ученик будет показан под именем из Telegram.`)) return
    setResetError(null)
    try {
      await resetNickname(row.user_id)
      queryClient.invalidateQueries({ queryKey: ['rating'] })
    } catch (e) {
      setResetError(e.message)
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Рейтинг</h1>
        <p className="muted">1 очко — за каждую задачу, решённую впервые (в тренировке или в пробнике).</p>
      </div>

      <div className="toolbar">
        <div className="segmented">
          {PERIODS.map((p) => (
            <button key={p.value} className={period === p.value ? 'active' : ''} onClick={() => setPeriod(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {resetError && <p className="error">Не удалось сбросить ник: {resetError}</p>}
      {!rating && !error && <p className="muted">Загрузка…</p>}

      {rating && (
        <>
          {rating.top.length === 0 ? (
            <div className="empty">
              {period === 'week' ? 'На этой неделе ещё никто не решал.' : 'Пока никто не решал задачи.'}{' '}
              <Link to="/">Станьте первым →</Link>
            </div>
          ) : (
            <ol className="leaderboard">
              {rating.top.map((r) => (
                <li key={r.user_id} className={`leaderboard__row ${r.is_me ? 'is-me' : ''}`}>
                  <span className={`leaderboard__place place-${r.place}`}>{r.place}</span>
                  <span className="avatar avatar--small">{rowName(r).slice(0, 1).toUpperCase()}</span>
                  <span className="leaderboard__name">
                    {rowName(r)}
                    {r.is_me && <span className="badge badge--me">вы</span>}
                    {isAdmin && r.has_nickname && (
                      <button type="button" className="leaderboard__reset" onClick={() => handleReset(r)}>
                        сбросить ник
                      </button>
                    )}
                  </span>
                  <span className="leaderboard__points">{r.points}</span>
                </li>
              ))}
            </ol>
          )}

          <p className="muted small leaderboard__footer">
            Участников: {rating.participants}.{' '}
            {!user && <><Link to="/login">Войдите</Link>, чтобы попасть в рейтинг.</>}
            {user && rating.me && !meInTop && (
              rating.me.place
                ? `Ваше место: ${rating.me.place}, очков: ${rating.me.points}.`
                : 'У вас пока нет очков за этот период — решите задачу, чтобы попасть в таблицу.'
            )}
          </p>
        </>
      )}
    </section>
  )
}

/** Имя в строке рейтинга: name — ник или имя из Telegram (first_name — у старого API). */
function rowName(row) {
  return row.name ?? row.first_name ?? ''
}
