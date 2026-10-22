import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../auth.jsx'

// Общая рамка всех страниц: шапка с меню, а ниже — текущая страница (<Outlet />).
export default function Layout() {
  const { user, checking } = useAuth()

  return (
    <>
      <header className="header">
        <div className="header__inner">
          <NavLink to="/tasks" className="logo">
            Geek<span>Season</span>
          </NavLink>
          <nav className="nav">
            <NavLink to="/tasks" className="nav__link">Задания</NavLink>
            {!checking && (user ? (
              <NavLink to="/profile" className="nav__link nav__user">
                <span className="avatar avatar--small">{user.first_name.slice(0, 1).toUpperCase()}</span>
                {user.first_name}
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
