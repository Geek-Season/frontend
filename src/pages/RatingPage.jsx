import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '../auth.jsx'
import Avatar from '../components/Avatar.jsx'
import RankMedal from '../components/RankMedal.jsx'
import StudentCard from '../components/StudentCard.jsx'
import { useNumbers, useRating } from '../queries.js'

const BOARDS = [
  { value: 'all', label: 'Всё время' },
  { value: 'week', label: 'Эта неделя' },
  { value: 'number', label: 'По номеру' },
]

// Ранги сверху вниз — для кнопок фильтра.
const RANKS = [
  ['immortal', 'Immortal'], ['divine', 'Божество'], ['overlord', 'Властелин'], ['legend', 'Легенда'],
  ['hero', 'Герой'], ['knight', 'Рыцарь'], ['recruit', 'Рекрут'],
]

const HINTS = {
  all: 'Места — по PTS. Другим виден только ранг, свой PTS видите только вы. В таблице — те, у кого есть ранг (после входного пробника).',
  week: 'Кто больше всех вырос с понедельника: сумма PTS за ответы и пробники (входной пробник не в счёт). Обнуляется каждый понедельник.',
  number: 'Лучшие в одном номере — по PTS в этом номере.',
}

function plural(n, one, few, many) {
  const tail = n % 100
  if (tail >= 11 && tail <= 14) return many
  if (n % 10 === 1) return one
  if (n % 10 >= 2 && n % 10 <= 4) return few
  return many
}

function RankTag({ row }) {
  return (
    <span className="lb__rank" title={row.rank.title}>
      <RankMedal rank={row.rank} size={26} />
      {row.rank.short}
      {row.immortal_place && <b className="lb__imm">#{row.immortal_place}</b>}
    </span>
  )
}

function Row({ row, right, isAdmin, onOpen }) {
  return (
    <li
      className={`lb__row lb__row--link ${row.is_me ? 'is-me' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`Карточка ученика ${row.name}`}
      onClick={() => onOpen(row.user_id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(row.user_id) } }}
    >
      <span className={`lb__place place-${row.place}`}>{row.place}</span>
      <Avatar name={row.name} url={row.avatar_url} size="small" />
      <span className="lb__name">
        {row.name}
        {row.is_me && <span className="badge badge--me">вы</span>}
        {isAdmin && (
          <Link className="lb__admin" to={`/admin?tab=users&user=${row.user_id}`} onClick={(e) => e.stopPropagation()} title="Открыть в админке" aria-label="Открыть в админке">⚙</Link>
        )}
      </span>
      <RankTag row={row} />
      <span className="lb__right">{right}</span>
    </li>
  )
}

// /rating — таблица лидеров по PTS. Таблица и фильтр — в адресе (?period=week, ?number=27&rank=legend).
export default function RatingPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const numbers = useNumbers().data ?? []
  const board = BOARDS.some((b) => b.value === params.get('board')) ? params.get('board') : 'all'
  const number = board === 'number' ? (params.get('number') || numbers[numbers.length - 1]?.code || '27') : null
  const rank = RANKS.some(([key]) => key === params.get('rank')) ? params.get('rank') : null

  const query = useRating({ period: board === 'week' ? 'week' : 'all', number, rank })
  const rating = query.data ?? null
  const isAdmin = user?.role === 'admin'
  const me = rating?.me

  // Открытая карточка — в адресе (?user=12): ссылкой можно поделиться, «Назад» закрывает её.
  const cardId = params.get('user')
  function openCard(id) {
    const next = new URLSearchParams(params)
    if (id == null) next.delete('user')
    else next.set('user', String(id))
    setParams(next, { replace: id == null })
  }

  function update(changes) {
    const next = { board, number: board === 'number' ? number : null, rank, ...changes }
    const clean = Object.fromEntries(Object.entries(next).filter(([key, v]) => v && !(key === 'board' && v === 'all')))
    if (next.board !== 'number') delete clean.number
    setParams(clean, { replace: true })
  }

  // Что показать справа в строке: прирост за неделю — у всех; свой PTS — только у себя.
  // Берём из самих данных (а не из вкладки): пока грузится новая таблица, видна прежняя целиком.
  function right(row) {
    if (row.growth != null) return <span className="lb__growth">↑ {row.growth} PTS</span>
    if (row.is_me && me?.pts != null) {
      return <span className="lb__mine">{rating.number ? `№ ${rating.number}: ` : ''}{me.pts.toLocaleString('ru-RU')} PTS</span>
    }
    return null
  }

  const rankTitle = RANKS.find(([key]) => key === rank)?.[1]
  const empty = rank
    ? `В ранге «${rankTitle}» здесь пока никого.`
    : board === 'week' ? 'На этой неделе ещё никто не вырос — решите новую задачу первым.'
      : board === 'number' ? 'В этом номере пока не отвечал никто из учеников с рангом.'
        : 'Пока ни у кого нет ранга — пройдите входной пробник первым.'

  return (
    <section>
      <div className="page-head">
        <h1>Рейтинг</h1>
        <p className="muted">{HINTS[board]}</p>
      </div>

      <div className="toolbar lb__toolbar">
        <div className="segmented">
          {BOARDS.map((b) => (
            <button key={b.value} className={board === b.value ? 'active' : ''} onClick={() => update({ board: b.value })}>
              {b.label}
            </button>
          ))}
        </div>
        {board === 'number' && (
          <select className="select" value={number ?? ''} onChange={(e) => update({ number: e.target.value })} aria-label="Номер ЕГЭ">
            {numbers.map((n) => <option key={n.code} value={n.code}>№ {n.code} — {n.title}</option>)}
          </select>
        )}
      </div>

      {rating && (
        <div className="lb__chips" role="group" aria-label="Ранг">
          <button className={`lb__chip ${!rank ? 'active' : ''}`} onClick={() => update({ rank: null })}>
            Все ранги <span>{rating.participants}</span>
          </button>
          {RANKS.filter(([key]) => rating.counts[key] || key === rank).map(([key, title]) => (
            <button key={key} className={`lb__chip ${rank === key ? 'active' : ''}`} onClick={() => update({ rank: key })}>
              <RankMedal rank={{ key, title }} size={20} />{title} <span>{rating.counts[key] ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      {query.error && !rating && <p className="error">{query.error.message}</p>}
      {!rating && !query.error && <p className="muted">Загрузка…</p>}

      {rating && (
        <>
          {rating.top.length === 0 ? (
            <div className="empty">{empty}</div>
          ) : (
            <ol className={`lb ${query.isPlaceholderData ? 'is-loading' : ''}`} aria-busy={query.isPlaceholderData}>
              {rating.top.map((r) => <Row key={r.user_id} row={r} right={right(r)} isAdmin={isAdmin} onOpen={openCard} />)}
              {me?.row && (
                <>
                  <li className="lb__gap" aria-hidden="true">⋯</li>
                  <Row row={me.row} right={right(me.row)} isAdmin={isAdmin} onOpen={openCard} />
                </>
              )}
            </ol>
          )}

          {user && me && !me.ranked && (
            <div className="lb__locked">
              <RankMedal locked size={56} />
              <div>
                <b>Вас пока нет в таблице</b>
                <p className="muted small">Пройдите входной пробник — он определит ранг, и вы появитесь в рейтинге.</p>
              </div>
              <Link className="btn" to="/exam">Пройти входной пробник</Link>
            </div>
          )}

          <p className="muted small lb__footer">
            Участников: {rating.participants}.{' '}
            {!user && <><Link to="/login">Войдите</Link>, чтобы попасть в рейтинг.</>}
            {me?.ranked && <MyLine me={me} board={board} number={number} rank={rank} />}
          </p>
        </>
      )}
      {cardId && <StudentCard id={Number(cardId)} self={Number(cardId) === user?.id} onClose={() => openCard(null)} />}
    </section>
  )
}

/** Строка под таблицей: своё место и сколько прогноза не хватает до следующего ранга. */
function MyLine({ me, board, number, rank }) {
  const parts = []
  if (me.place) parts.push(`Ваше место: ${me.place}`)
  else if (board === 'week') parts.push('Вы ещё не выросли на этой неделе — решите новые задачи, чтобы попасть в таблицу')
  else if (board === 'number' && me.pts == null) parts.push(`В № ${number} вы ещё не отвечали`)
  else if (rank) parts.push('Вы в другом ранге')
  if (me.next_rank) {
    const n = me.next_rank.primary_needed
    parts.push(`до «${me.next_rank.rank.title}» — прогноз ещё +${n} ${plural(n, 'первичный балл', 'первичных балла', 'первичных баллов')}`)
  }
  return parts.join(' · ') + '.'
}
