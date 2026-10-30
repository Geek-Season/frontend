import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../auth.jsx'

// Общая рамка всех страниц: шапка с меню, а ниже — текущая страница (<Outlet />).
export default function Layout() {
  const { user, checking } = useAuth()
  // «Задания» подсвечены и на главной, и на странице номера (/tasks/17).
  const { pathname } = useLocation()
  const onTasks = pathname === '/' || pathname.startsWith('/tasks')

  // Ссылки на главную роутер пишет без слэша на конце (/frontend), а GitHub Pages
  // сразу (со статусом 200) отдаёт только /frontend/. Дописываем слэш в адресной
  // строке — тогда F5 на главной всегда даёт настоящую страницу.
  useEffect(() => {
    const base = import.meta.env.BASE_URL
    if (base !== '/' && window.location.pathname === base.replace(/\/+$/, '')) {
      window.history.replaceState(window.history.state, '', base + window.location.search + window.location.hash)
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
                <span className="avatar avatar--small">{user.first_name.slice(0, 1).toUpperCase()}</span>
                <span className="nav__user-name">{user.first_name}</span>
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
