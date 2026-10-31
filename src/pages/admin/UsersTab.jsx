import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import Avatar from '../../components/Avatar.jsx'
import RankMedal from '../../components/RankMedal.jsx'
import { useAdminUsers } from '../../queries.js'
import { day, lastSeen } from './format.js'
import UserCard from './UserCard.jsx'

const FILTERS = [
  ['all', 'Все'],
  ['admins', 'Админы'],
  ['blocked', 'Заблокированные'],
  ['no_rank', 'Без ранга'],
]

const SORTS = [
  ['new', 'Сначала новые'],
  ['recent', 'Недавно заходили'],
  ['pts', 'По PTS'],
  ['solved', 'По решённым задачам'],
  ['name', 'По имени'],
]

// Вкладка «Ученики»: поиск, фильтр, сортировка; клик по строке — карточка ученика.
// Открытая карточка — в адресе (?tab=users&user=5): F5 и «Назад» работают.
export default function UsersTab() {
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('new')
  const openId = params.get('user')

  // Поиск — когда перестали печатать, а не на каждую букву.
  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text])

  const query = useAdminUsers({ q, filter, sort })
  const pages = query.data?.pages ?? []
  const rows = pages.flatMap((page) => page.items)
  const total = pages[0]?.total

  function open(id) {
    setParams(id == null ? { tab: 'users' } : { tab: 'users', user: String(id) })
  }

  return (
    <>
      <div className="toolbar admin-users__toolbar">
        <input
          className="input admin-users__search"
          type="search"
          placeholder="Поиск: имя, ник, @username, Telegram ID"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Фильтр">
          {FILTERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Сортировка">
          {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {query.error && <p className="error">{query.error.message}</p>}
      {query.isPending && <p className="muted">Загрузка…</p>}
      {!query.isPending && rows.length === 0 && <div className="empty">Никого не нашлось.</div>}

      {rows.length > 0 && (
        <>
          <p className="muted small">Найдено: {total}</p>
          <table className="admin-users">
            <thead>
              <tr>
                <th>Ученик</th>
                <th>Ранг</th>
                <th className="num">PTS</th>
                <th className="num">Задач</th>
                <th className="admin-users__wide">На сайте с</th>
                <th className="admin-users__wide">Был</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr
                  key={u.id}
                  className={u.blocked ? 'is-blocked' : ''}
                  tabIndex={0}
                  onClick={() => open(u.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') open(u.id) }}
                >
                  <td>
                    <div className="admin-users__who">
                      <Avatar name={u.display_name} url={u.avatar_url} />
                      <div>
                        <div className="admin-users__name">{u.display_name}</div>
                        <div className="muted small">
                          {u.username ? `@${u.username}` : 'без @username'}
                          {u.role === 'admin' && ' · админ'}
                          {u.blocked && <span className="admin-users__blocked"> · заблокирован</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {u.rank ? (
                      <span className="admin-users__rank"><RankMedal rank={u.rank} size={22} /> {u.rank.short}</span>
                    ) : <span className="muted">— нет пробника</span>}
                  </td>
                  <td className="num mono">{u.pts}</td>
                  <td className="num">{u.solved}</td>
                  <td className="admin-users__wide">{day(u.created_at)}</td>
                  <td className="admin-users__wide">{lastSeen(u.last_login_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {query.hasNextPage && (
            <button className="btn btn--ghost wide" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
              {query.isFetchingNextPage ? 'Загрузка…' : 'Показать ещё'}
            </button>
          )}
        </>
      )}

      {openId && <UserCard id={Number(openId)} onClose={() => open(null)} />}
    </>
  )
}
