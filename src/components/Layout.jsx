import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { displayName, useAuth } from '../auth.jsx'
import Avatar from './Avatar.jsx'

// Общая рамка всех страниц: шапка с меню, а ниже — текущая страница (<Outlet />).
export default function Layout() {
  const { user, checking } = useAuth()
  // «Задания» подсвечены и на главной, и на странице номера (/tasks/17).
  const { pathname } = useLocation()
  const onTasks = pathname === '/' || pathname.startsWith('/tasks')

  // На GitHub Pages адрес страницы со слэшем на конце (/frontend/rating/) отдаётся из
  // rating/index.html со статусом 200 (копии кладёт scripts/pages-routes.mjs), а без
  // слэша — нет. Роутер пишет ссылки без слэша, поэтому дописываем его в адресной
  // строке: тогда F5 на любой известной странице даёт настоящую страницу, а не 404.
  useEffect(() => {
    if (import.meta.env.BASE_URL === '/') return // локальная разработка — не нужно
    const { pathname: path, search, hash } = window.location
    const last = path.slice(path.lastIndexOf('/') + 1)
    if (!path.endsWith('/') && !last.includes('.')) {
      window.history.replaceState(window.history.state, '', `${path}/${search}${hash}`)
    }
  }, [pathname])

  return (
    <>
      <header className="header">
        <div className="header__inner">
          <NavLink to="/" className="logo">
            Geek<span>Season</span>
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end className={`nav__link ${onTasks ? 'active' : ''}`}>Задания</NavLink>
            <NavLink to="/exam" className="nav__link">Пробник</NavLink>
            <NavLink to="/rating" className="nav__link">Рейтинг</NavLink>
            {user?.role === 'admin' && <NavLink to="/admin" className="nav__link nav__link--admin">Редактор</NavLink>}
            {!checking && (user ? (
              <NavLink to="/profile" className="nav__link nav__user">
                <Avatar name={displayName(user)} url={user.avatar_url} size="small" />
                <span className="nav__user-name">{displayName(user)}</span>
              </NavLink>
            ) : (
              <NavLink to="/login" className="nav__link nav__login">Войти</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  )
}
