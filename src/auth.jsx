// Кто вошёл на сайт — общее знание для всех страниц.
//
// Токен хранится в localStorage браузера, чтобы не входить заново
// после перезагрузки страницы. При открытии сайта спрашиваем у бэкенда
// /auth/me: если токен истёк или поддельный — просто выходим.

import { createContext, useContext, useEffect, useState } from 'react'

import { getMe, setAuthToken, setUnauthorizedHandler } from './api.js'
import { queryClient } from './queryClient.js'

const STORAGE_KEY = 'geek-season-token'
const AuthContext = createContext(null)

function readStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null // localStorage бывает недоступен (приватный режим и т. п.)
  }
}

function storeToken(token) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // без localStorage вход просто не переживёт перезагрузку
  }
}

export function AuthProvider({ children }) {
  // Токен подставляем в api.js сразу, ещё до первой отрисовки:
  // иначе страницы успеют отправить первые запросы «анонимно».
  const [savedToken] = useState(() => {
    const token = readStoredToken()
    setAuthToken(token)
    return token
  })
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(Boolean(savedToken)) // проверяем сохранённый токен

  useEffect(() => {
    if (!savedToken) return
    getMe()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setChecking(false))
  }, [savedToken])

  function login(token, userData) {
    storeToken(token)
    setAuthToken(token)
    setUser(userData)
  }

  function logout() {
    storeToken(null)
    setAuthToken(null)
    setUser(null)
    // Кэш ответов API — данные этого ученика; следующему в этом браузере они не нужны.
    // Очищаем после перерисовки: иначе открытая страница (например, профиль) успела бы
    // перезапросить свои данные уже без токена. Чужих данных не покажет и сейчас —
    // ключи кэша содержат id ученика.
    setTimeout(() => queryClient.clear(), 0)
  }

  // Сервер ответил 401 на запрос с токеном — токен истёк: выходим.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/** В любом компоненте: const { user, login, logout } = useAuth() */
export function useAuth() {
  return useContext(AuthContext)
}
