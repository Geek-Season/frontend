import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  getMe,
  patchAdminUser,
  recalibrateUser,
  resetUserAvatar,
  resetUserStats,
  setUserPts,
} from '../../api.js'
import { useAuth } from '../../auth.jsx'
import Avatar from '../../components/Avatar.jsx'
import RankMedal from '../../components/RankMedal.jsx'
import { useAdminUser, useInvalidate } from '../../queries.js'
import { dateInput, day, moment, since } from './format.js'

const RANKS = [
  ['immortal', 'Immortal'],
  ['divine', 'Божество 24 и 25'],
  ['overlord', 'Властелин теории игр'],
  ['legend', 'Легенда экселя'],
  ['hero', 'Герой рекурсии'],
  ['knight', 'Рыцарь черепахи'],
  ['recruit', 'Рекрут ворда'],
]

function plural(n, one, few, many) {
  const tail = n % 100
  if (tail >= 11 && tail <= 14) return many
  if (n % 10 === 1) return one
  if (n % 10 >= 2 && n % 10 <= 4) return few
  return many
}

/** Кнопка с подтверждением прямо на месте: «Сбросить» → «Точно? Да / Нет». */
function ConfirmButton({ label, question, yes = 'Да', danger = false, disabled, busy, onConfirm }) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <button
        type="button"
        className={`btn btn--small ${danger ? 'btn--danger-outline' : 'btn--ghost'}`}
        disabled={disabled || busy}
        onClick={() => setAsking(true)}
      >
        {busy ? 'Минутку…' : label}
      </button>
    )
  }
  return (
    <span className="confirm">
      <span className="confirm__question">{question}</span>
      <button type="button" className={`btn btn--small ${danger ? 'btn--danger' : ''}`} onClick={() => { setAsking(false); onConfirm() }}>
        {yes}
      </button>
      <button type="button" className="btn btn--ghost btn--small" onClick={() => setAsking(false)}>Отмена</button>
    </span>
  )
}

function Row({ label, children, action, hint }) {
  return (
    <div className="admin-card__row">
      <div className="admin-card__label">{label}</div>
      <div className="admin-card__value">
        {children}
        {hint && <div className="muted small">{hint}</div>}
      </div>
      {action && <div className="admin-card__action">{action}</div>}
    </div>
  )
}

// Карточка ученика: все действия админа с ним. Каждое изменение — в журнал (это делает сервер).
export default function UserCard({ id, onClose }) {
  const { user: me, updateUser } = useAuth()
  const query = useAdminUser(id)
  const invalidate = useInvalidate()
  const u = query.data
  const [busy, setBusy] = useState(null) // какое действие сейчас выполняется
  const [message, setMessage] = useState(null)

  // Черновики полей — из карточки (и заново, когда карточка обновилась с сервера).
  const [nick, setNick] = useState('')
  const [pts, setPts] = useState('')
  const [rank, setRank] = useState('hero')
  const [created, setCreated] = useState('')
  useEffect(() => {
    if (!u) return
    setNick(u.nickname ?? '')
    setPts(String(u.pts))
    setRank(u.rank?.key ?? 'hero')
    setCreated(dateInput(u.created_at))
  }, [u])

  useEffect(() => {
    const close = (e) => { if (e.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [busy, onClose])

  async function run(key, action, done) {
    setBusy(key)
    setMessage(null)
    try {
      const detail = await action()
      invalidate.userChanged(detail)
      if (detail.id === me.id) updateUser(await getMe()) // правка себя — шапка и профиль сразу видят её
      setMessage({ type: 'ok', text: done })
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setBusy(null)
    }
  }

  const self = u?.id === me.id
  const nickChanged = u && nick.trim() !== (u.nickname ?? '')
  const ptsValue = Number(pts)
  const ptsValid = pts.trim() !== '' && Number.isInteger(ptsValue) && ptsValue >= 0 && ptsValue <= 3000

  function createdAt() {
    // Выбран сегодняшний день — «сейчас» (полдень мог бы оказаться в будущем), иначе полдень того дня.
    if (created === dateInput(new Date().toISOString())) return new Date().toISOString()
    return new Date(`${created}T12:00:00`).toISOString()
  }

  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="modal__sheet modal__sheet--wide" role="dialog" aria-modal="true" aria-labelledby="user-card-title">
        <div className="modal__head admin-card__head">
          {u ? (
            <div className="admin-card__who">
              <Avatar name={u.display_name} url={u.avatar_url} className="admin-card__avatar" />
              <div>
                <h2 id="user-card-title">{u.display_name}</h2>
                <div className="muted small">
                  {u.username ? `@${u.username}` : 'без @username'} · Telegram ID {u.telegram_id} · id {u.id}
                  {u.role === 'admin' && ' · админ'}
                  {u.blocked && <span className="admin-users__blocked"> · заблокирован</span>}
                </div>
              </div>
            </div>
          ) : <h2 id="user-card-title">Ученик</h2>}
          <button type="button" className="modal__close" aria-label="Закрыть" onClick={onClose} disabled={Boolean(busy)}>×</button>
        </div>

        <div className="modal__body">
          {query.isPending && <p className="muted">Загрузка…</p>}
          {query.error && <p className="error">{query.error.message}</p>}
          {u && (
            <>
              {message && <p className={message.type === 'error' ? 'error' : 'success'} role="status">{message.text}</p>}

              <h3 className="admin-card__section">Рейтинг</h3>
              <Row label="Ранг">
                {u.rank ? (
                  <>
                    <span className="admin-users__rank"><RankMedal rank={u.rank} size={22} /> {u.rank.title}</span>
                    <span className="muted"> · прогноз {u.forecast_primary} перв. → {u.forecast_score} {plural(u.forecast_score, 'балл', 'балла', 'баллов')}
                      {u.calibrated_at && ` · откалиброван ${moment(u.calibrated_at)}`}</span>
                  </>
                ) : <span className="muted">нет — ещё не было входного пробника</span>}
              </Row>
              <Row
                label="Выставить ранг"
                hint="PTS подберётся так, чтобы прогноз оказался в середине ранга"
                action={
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    disabled={Boolean(busy) || rank === u.rank?.key}
                    onClick={() => run('rank', () => setUserPts(u.id, { rank }), 'Ранг выставлен')}
                  >
                    {busy === 'rank' ? 'Минутку…' : 'Выставить'}
                  </button>
                }
              >
                <select className="select" value={rank} onChange={(e) => setRank(e.target.value)} aria-label="Ранг">
                  {RANKS.map(([key, title]) => <option key={key} value={key}>{title}</option>)}
                </select>
              </Row>
              <Row
                label="PTS"
                hint={`±${u.pts_rd} · засчитано задач: ${u.games}. Ранг пересчитается по прогнозу`}
                action={
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    disabled={Boolean(busy) || !ptsValid || ptsValue === u.pts}
                    onClick={() => run('pts', () => setUserPts(u.id, { pts: ptsValue }), 'PTS изменён')}
                  >
                    {busy === 'pts' ? 'Минутку…' : 'Изменить'}
                  </button>
                }
              >
                <input
                  className="input input--short mono"
                  inputMode="numeric"
                  value={pts}
                  onChange={(e) => setPts(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  aria-label="PTS"
                />
              </Row>
              <Row
                label="Калибровка"
                action={
                  <ConfirmButton
                    label="Сбросить калибровку"
                    question="Ранг пропадёт до пробника. Сбросить?"
                    yes="Сбросить"
                    danger
                    disabled={!u.calibrated_at}
                    busy={busy === 'recalibrate'}
                    onConfirm={() => run('recalibrate', () => recalibrateUser(u.id), 'Калибровка сброшена: следующий пробник — входной')}
                  />
                }
              >
                {u.calibrated_at
                  ? 'Следующий пробник станет входным и выставит ранг заново'
                  : <span className="muted">Сбрасывать нечего: следующий пробник и так входной</span>}
              </Row>

              <h3 className="admin-card__section">Профиль</h3>
              <Row
                label="Имя на сайте"
                hint={`В Telegram: ${[u.first_name, u.last_name].filter(Boolean).join(' ')}. Пустое поле — имя из Telegram`}
                action={u.nickname && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    disabled={Boolean(busy)}
                    onClick={() => run('nick-reset', () => patchAdminUser(u.id, { nickname: null }), 'Ник сброшен')}
                  >
                    Сбросить ник
                  </button>
                )}
              >
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    run('nick', () => patchAdminUser(u.id, { nickname: nick.trim() || null }), 'Ник сохранён')
                  }}
                >
                  <input className="input" value={nick} maxLength={20} placeholder={u.first_name} onChange={(e) => setNick(e.target.value)} aria-label="Ник" />
                  <button className="btn btn--ghost btn--small" disabled={Boolean(busy) || !nickChanged}>
                    {busy === 'nick' ? 'Минутку…' : 'Сохранить'}
                  </button>
                </form>
              </Row>
              <Row
                label="Аватарка"
                action={u.has_custom_avatar && (
                  <ConfirmButton
                    label="Сбросить аватарку"
                    question="Вернуть фото из Telegram?"
                    yes="Сбросить"
                    busy={busy === 'avatar'}
                    onConfirm={() => run('avatar', () => resetUserAvatar(u.id), 'Аватарка сброшена: снова фото из Telegram')}
                  />
                )}
              >
                {u.has_custom_avatar ? 'Своя картинка' : u.avatar_url ? 'Фото из Telegram' : <span className="muted">Нет — показывается буква</span>}
              </Row>
              <Row
                label="На сайте с"
                hint={created && `В профиле: «${since(`${created}T12:00:00`)}»`}
              >
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    run('created', () => patchAdminUser(u.id, { created_at: createdAt() }), 'Дата регистрации изменена')
                  }}
                >
                  <input
                    className="input input--date"
                    type="date"
                    value={created}
                    max={dateInput(new Date().toISOString())}
                    onChange={(e) => setCreated(e.target.value)}
                    aria-label="Дата регистрации"
                  />
                  <button className="btn btn--ghost btn--small" disabled={Boolean(busy) || !created || created === dateInput(u.created_at)}>
                    {busy === 'created' ? 'Минутку…' : 'Сохранить'}
                  </button>
                </form>
              </Row>

              <h3 className="admin-card__section">Доступ</h3>
              <Row
                label="Роль"
                hint={self ? 'Свою роль поменять нельзя — попросите другого админа'
                  : u.admin_from_env && u.role === 'admin' ? 'Этот Telegram ID в ADMIN_TELEGRAM_IDS: права вернутся при следующем входе' : null}
                action={
                  <ConfirmButton
                    label={u.role === 'admin' ? 'Снять права' : 'Назначить админом'}
                    question={u.role === 'admin' ? 'Снять права админа?' : 'Дать доступ к админке?'}
                    disabled={self}
                    busy={busy === 'role'}
                    onConfirm={() => run('role', () => patchAdminUser(u.id, { role: u.role === 'admin' ? 'student' : 'admin' }),
                      u.role === 'admin' ? 'Права администратора сняты' : 'Назначен администратором')}
                  />
                }
              >
                {u.role === 'admin' ? 'Администратор' : 'Ученик'}
              </Row>
              <Row
                label="Блокировка"
                hint={!u.blocked && (self ? 'Себя заблокировать нельзя' : u.role === 'admin' ? 'Сначала снимите права администратора' : null)}
                action={
                  <ConfirmButton
                    label={u.blocked ? 'Разблокировать' : 'Заблокировать'}
                    question={u.blocked ? 'Вернуть доступ?' : 'Не сможет войти, пропадёт из рейтинга. Заблокировать?'}
                    danger={!u.blocked}
                    disabled={!u.blocked && (self || u.role === 'admin')}
                    busy={busy === 'block'}
                    onConfirm={() => run('block', () => patchAdminUser(u.id, { blocked: !u.blocked }),
                      u.blocked ? 'Разблокирован' : 'Заблокирован')}
                  />
                }
              >
                {u.blocked ? <span className="admin-users__blocked">Заблокирован с {day(u.blocked_at)}</span> : 'Активен'}
              </Row>

              <h3 className="admin-card__section">Статистика</h3>
              <Row
                label="Всего"
                action={
                  <ConfirmButton
                    label="Сбросить всю статистику"
                    question={`Удалить ${u.attempts} ${plural(u.attempts, 'ответ', 'ответа', 'ответов')} и ${u.exams} ${plural(u.exams, 'пробник', 'пробника', 'пробников')}? Отменить нельзя.`}
                    yes="Удалить"
                    danger
                    disabled={u.attempts + u.exams + u.games + u.achievements === 0 && !u.calibrated_at}
                    busy={busy === 'reset'}
                    onConfirm={() => run('reset', () => resetUserStats(u.id), 'Статистика сброшена')}
                  />
                }
              >
                решено задач {u.solved} · ответов {u.attempts} · пробников {u.exams} · достижений {u.achievements}
              </Row>

              <h3 className="admin-card__section">Последние действия админов</h3>
              {u.actions.length === 0 ? <p className="muted small">Пока ничего.</p> : (
                <ul className="admin-card__log">
                  {u.actions.map((a) => (
                    <li key={a.id}>
                      <span className="muted">{moment(a.created_at)}</span> — {a.admin?.name ?? 'удалённый админ'} {a.text}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="modal__foot admin-card__foot">
          <span className="muted small">Все изменения попадают в <Link to="/admin?tab=log">журнал</Link></span>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={Boolean(busy)}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}
