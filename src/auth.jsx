// Кто вошёл на сайт — общее знание для всех страниц.
//
// Токен хранится в localStorage браузера, чтобы не входить заново
// после перезагрузки страницы. При открытии сайта спрашиваем у бэкенда
// /auth/me: если токен истёк или поддельный — просто выходим.

import { createContext, useContext, useEffect, useState } from 'react'

import { getMe, setAuthToken } from './api.js'

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
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true) // проверяем сохранённый токен

  useEffect(() => {
    const token = readStoredToken()
    if (!token) {
      setChecking(false)
      return
    }
    setAuthToken(token)
    getMe()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setChecking(false))
  }, [])

  function login(token, userData) {
    storeToken(token)
    setAuthToken(token)
    setUser(userData)
  }

  function logout() {
    storeToken(null)
    setAuthToken(null)
    setUser(null)
  }

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
