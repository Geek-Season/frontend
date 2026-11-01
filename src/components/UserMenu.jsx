// Меню под аватаркой в шапке: «Профиль», «Настройки», «Админка» (только админу) и «Выйти».
// Закрывается кликом мимо, Esc, выбором пункта и переходом на другую страницу.

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { displayName, useAuth } from '../auth.jsx'
import Avatar from './Avatar.jsx'
import ProfileSettings from './ProfileSettings.jsx'

const icon = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

const UserIcon = () => <svg {...icon}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
const GearIcon = () => (
  <svg {...icon}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)
const ShieldIcon = () => <svg {...icon}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>
const DoorIcon = () => <svg {...icon}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>

export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const root = useRef(null)
  const button = useRef(null)
  const menu = useRef(null)

  useEffect(() => setOpen(false), [pathname]) // перешли на другую страницу — меню закрыто

  useEffect(() => {
    if (!open) return undefined
    menu.current?.querySelector('[role="menuitem"]')?.focus()
    const outside = (e) => { if (!root.current?.contains(e.target)) setOpen(false) }
    const keys = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { // стрелками — по пунктам по кругу
        e.preventDefault()
        const items = [...menu.current.querySelectorAll('[role="menuitem"]')]
        const index = items.indexOf(document.activeElement)
        items[(index + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
      }
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', keys)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', keys)
    }
  }, [open])

  const name = displayName(user)
  const onProfile = pathname.startsWith('/profile')

  return (
    <span className="usermenu" ref={root}>
      <button
        ref={button}
        type="button"
        className={`nav__link nav__user ${onProfile || open ? 'active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Меню: ${name}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={name} url={user.avatar_url} size="small" />
        <span className="nav__user-name">{name}</span>
        <span className={`usermenu__caret ${open ? 'is-open' : ''}`} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="usermenu__menu" role="menu" ref={menu}>
          <div className="usermenu__who">
            <b>{name}</b>
            {user.username && <span>@{user.username}</span>}
          </div>
          <Link role="menuitem" to="/profile" onClick={() => setOpen(false)}><UserIcon /> Профиль</Link>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); setSettingsOpen(true) }}>
            <GearIcon /> Настройки
          </button>
          {user.role === 'admin' && (
            <Link role="menuitem" to="/admin" onClick={() => setOpen(false)}><ShieldIcon /> Админка</Link>
          )}
          <hr />
          <button
            role="menuitem"
            type="button"
            className="usermenu__danger"
            onClick={() => { setOpen(false); logout(); navigate('/') }}
          >
            <DoorIcon /> Выйти
          </button>
        </div>
      )}

      {settingsOpen && <ProfileSettings onClose={() => setSettingsOpen(false)} />}
    </span>
  )
}
