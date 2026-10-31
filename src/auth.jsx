// Кто вошёл на сайт — общее знание для всех страниц.
//
// Токен хранится в localStorage браузера, чтобы не входить заново
// после перезагрузки страницы. При открытии сайта спрашиваем у бэкенда
// /auth/me: если токен истёк или поддельный — просто выходим.

import { createContext, useContext, useEffect, useState } from 'react'

import { BLOCKED, getMe, setAuthToken, setUnauthorizedHandler } from './api.js'
import { queryClient } from './queryClient.js'

const STORAGE_KEY = 'geek-season-token'
const AuthContext = createContext(null)

// Рядом с токеном храним id ученика: после перезагрузки страницы ключи кэша
// (queries.js) известны сразу, и данные грузятся одновременно с проверкой токена,
// а не дважды — сначала «как гость», потом ещё раз как ученик.
const USER_ID_KEY = 'geek-season-user-id'

function readStored(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // localStorage бывает недоступен (приватный режим и т. п.)
  }
}

function store(key, value) {
  try {
    if (value != null) localStorage.setItem(key, String(value))
    else localStorage.removeItem(key)
  } catch {
    // без localStorage вход просто не переживёт перезагрузку
  }
}

function storeToken(token) {
  store(STORAGE_KEY, token)
}

export function AuthProvider({ children }) {
  // Токен подставляем в api.js сразу, ещё до первой отрисовки:
  // иначе страницы успеют отправить первые запросы «анонимно».
  const [savedToken] = useState(() => {
    const token = readStored(STORAGE_KEY)
    setAuthToken(token)
    return token
  })
  // id из прошлого входа — только пока /auth/me не ответил (см. useMe в queries.js).
  const [savedUserId] = useState(() => (savedToken ? readStored(USER_ID_KEY) : null))
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(Boolean(savedToken)) // проверяем сохранённый токен

  useEffect(() => {
    if (!savedToken) return
    getMe()
      .then((me) => {
        setUser(me)
        store(USER_ID_KEY, me.id)
      })
      .catch((e) => logout(e?.message === BLOCKED ? 'blocked' : undefined))
      .finally(() => setChecking(false))
  }, [savedToken])

  // Админ заблокировал аккаунт — страница входа скажет об этом (до следующего входа).
  const [blocked, setBlocked] = useState(false)

  function login(token, userData) {
    setBlocked(false)
    storeToken(token)
    store(USER_ID_KEY, userData.id)
    setAuthToken(token)
    setUser(userData)
  }

  function logout(reason) {
    if (reason === 'blocked') setBlocked(true)
    storeToken(null)
    store(USER_ID_KEY, null)
    setAuthToken(null)
    setUser(null)
    // Кэш ответов API — данные этого ученика; следующему в этом браузере они не нужны.
    // Очищаем после перерисовки: иначе открытая страница (например, профиль) успела бы
    // перезапросить свои данные уже без токена. Чужих данных не покажет и сейчас —
    // ключи кэша содержат id ученика.
    setTimeout(() => queryClient.clear(), 0)
  }

  // Сервер ответил 401 на запрос с токеном — токен истёк: выходим (403 «заблокирован» — тоже).
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, checking, savedUserId, blocked, login, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

/** В любом компоненте: const { user, login, logout, updateUser } = useAuth() */
export function useAuth() {
  return useContext(AuthContext)
}

/** Как ученика зовут на сайте: ник, а если его нет — имя из Telegram. */
export function displayName(user) {
  return user?.display_name || user?.nickname || user?.first_name || ''
}
