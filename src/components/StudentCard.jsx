import { useEffect } from 'react'

import { useStudentCard } from '../queries.js'
import ActivityCalendar from './ActivityCalendar.jsx'
import Avatar from './Avatar.jsx'
import RankMedal from './RankMedal.jsx'

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа',
  'сентября', 'октября', 'ноября', 'декабря']

function plural(n, one, few, many) {
  const tail = n % 100
  if (tail >= 11 && tail <= 14) return many
  if (n % 10 === 1) return one
  if (n % 10 >= 2 && n % 10 <= 4) return few
  return many
}

// Публичная карточка ученика: открывается по клику на строку рейтинга (и «Как меня видят» в профиле).
// Видно только ранг, место, решённые задачи, серию, достижения и активность — ни PTS, ни прогноза.
export default function StudentCard({ id, self = false, onClose }) {
  const query = useStudentCard(id)
  const card = query.data

  useEffect(() => {
    const close = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  const since = card && new Date(card.since)

  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal__sheet modal__sheet--wide" role="dialog" aria-modal="true" aria-labelledby="student-card-title">
        <div className="modal__head">
          <h2 id="student-card-title">{self ? 'Так вас видят другие' : 'Карточка ученика'}</h2>
          <button type="button" className="modal__close" aria-label="Закрыть" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          {query.isPending && <p className="muted">Загрузка…</p>}
          {query.error && <p className="error">{query.error.message}</p>}
          {card && (
            <>
              <div className="pcard__top">
                <Avatar name={card.name} url={card.avatar_url} className="pcard__avatar" />
                <div className="pcard__who">
                  <div className="pcard__name">{card.name}</div>
                  <div className="muted small">Занимается с {MONTHS[since.getMonth()]} {since.getFullYear()}</div>
                </div>
                <div className="pcard__rank">
                  {card.rank ? (
                    <>
                      <RankMedal rank={card.rank} size={84} />
                      <div className="pcard__rank-title">
                        {card.rank.title}
                        {card.immortal_place && <b className="lb__imm"> #{card.immortal_place}</b>}
                      </div>
                      {card.place && <div className="muted small">{card.place} место в рейтинге</div>}
                    </>
                  ) : (
                    <>
                      <RankMedal locked size={84} />
                      <div className="pcard__rank-title muted">Ранг не определён</div>
                      <div className="muted small">ещё не было входного пробника</div>
                    </>
                  )}
                </div>
              </div>

              <div className="tiles tiles--3 pcard__tiles">
                <div className="tile">
                  <span className="tile__label">Решено задач</span>
                  <span className="tile__value">{card.solved}</span>
                </div>
                <div className="tile">
                  <span className="tile__label">Серия</span>
                  <span className="tile__value">{card.streak} {plural(card.streak, 'день', 'дня', 'дней')}</span>
                  <span className="tile__hint">подряд без пропусков</span>
                </div>
                <div className="tile">
                  <span className="tile__label">Достижения</span>
                  <span className="tile__value">{card.achievements.length} <span className="tile__of">из {card.achievements_total}</span></span>
                </div>
              </div>

              {card.achievements.length > 0 && (
                <div className="pcard__ach">
                  {card.achievements.map((a) => (
                    <span key={a.code} className="pcard__badge"><span aria-hidden="true">{a.icon}</span>{a.title}</span>
                  ))}
                </div>
              )}

              <h3 className="admin-card__section">Активность</h3>
              <ActivityCalendar calendar={card.calendar} compact />
            </>
          )}
        </div>
        <div className="modal__foot pcard__foot">
          <span className="muted small">
            {self ? 'PTS, прогноз балла и пробники видите только вы' : 'Другим видны только ранг, решённые задачи и активность'}
          </span>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}
