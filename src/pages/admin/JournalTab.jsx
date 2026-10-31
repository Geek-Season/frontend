import { Link } from 'react-router-dom'

import { useAdminActions } from '../../queries.js'
import { moment } from './format.js'

// Вкладка «Журнал»: все действия админов, новые сверху. Имя ученика — ссылка на его карточку.
export default function JournalTab() {
  const query = useAdminActions()
  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  if (query.isPending) return <p className="muted">Загрузка…</p>
  if (query.error) return <p className="error">{query.error.message}</p>
  if (items.length === 0) return <div className="empty">Админы пока ничего не меняли.</div>

  return (
    <>
      <ul className="journal">
        {items.map((a) => (
          <li key={a.id} className="journal__row">
            <span className="journal__time muted">{moment(a.created_at)}</span>
            <span className="journal__text">
              <b>{a.admin?.name ?? 'удалённый админ'}</b> {a.text}
              {a.user && (
                <>
                  {' — '}
                  <Link to={`/admin?tab=users&user=${a.user.id}`}>{a.user.name}</Link>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      {query.hasNextPage && (
        <button className="btn btn--ghost wide" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
          {query.isFetchingNextPage ? 'Загрузка…' : 'Показать ещё'}
        </button>
      )}
    </>
  )
}
