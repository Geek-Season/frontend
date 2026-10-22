import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '../auth.jsx'

export default function ProfilePage() {
  const { user, checking, logout } = useAuth()

  if (checking) return <p className="muted">Загрузка…</p>
  if (!user) return <Navigate to="/login" replace />

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
  const joined = new Date(user.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <section>
      <div className="profile">
        <div className="avatar">{user.first_name.slice(0, 1).toUpperCase()}</div>
        <div>
          <h1>{fullName}</h1>
          {user.username && <p className="muted">@{user.username}</p>}
          <p className="muted small">На сайте с {joined}</p>
        </div>
      </div>

      <div className="placeholder">
        <p>Здесь появится ваш прогресс: решённые задачи, слабые темы и пробники.</p>
        <Link to="/tasks" className="btn">Решать задания</Link>
      </div>

      <button className="btn btn--ghost" onClick={logout}>Выйти</button>
    </section>
  )
}
