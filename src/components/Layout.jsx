import { NavLink, Outlet } from 'react-router-dom'

// Общая рамка всех страниц: шапка с меню, а ниже — текущая страница (<Outlet />).
export default function Layout() {
  return (
    <>
      <header className="header">
        <div className="header__inner">
          <NavLink to="/tasks" className="logo">
            Geek<span>Season</span>
          </NavLink>
          <nav className="nav">
            <NavLink to="/tasks" className="nav__link">Задания</NavLink>
            <NavLink to="/profile" className="nav__link">Профиль</NavLink>
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  )
}
