import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { getLoginStatus, loginWithCode, startTelegramLogin } from '../api.js'
import { useAuth } from '../auth.jsx'

const POLL_MS = 2000

// ---------- QR-ключ: один на несколько заходов ----------
//
// Каждый ключ — запрос к серверу и запись в Redis на 5 минут. Поэтому, пока ключ
// не истёк, повторный заход на «Войти» (и F5) показывает тот же QR без запроса.
// Ключ хранится в sessionStorage — только в этой вкладке; без него — в памяти.

const QR_STORAGE_KEY = 'geek-season-qr'
const MIN_LEFT_MS = 20 * 1000 // ключ, которому осталось меньше 20 с, не показываем: не успеть отсканировать
let memoryQr = null
let pendingQr = null // идущий запрос: два одновременных открытия страницы не создадут два ключа

function readSavedQr() {
  let saved = memoryQr
  try {
    saved = JSON.parse(sessionStorage.getItem(QR_STORAGE_KEY)) ?? saved
  } catch {
    // sessionStorage недоступен (приватный режим и т. п.) — остаётся копия в памяти
  }
  return saved && saved.expiresAt - Date.now() > MIN_LEFT_MS ? saved : null
}

function saveQr(qr) {
  memoryQr = qr
  try {
    if (qr) sessionStorage.setItem(QR_STORAGE_KEY, JSON.stringify(qr))
    else sessionStorage.removeItem(QR_STORAGE_KEY)
  } catch {
    // без sessionStorage ключ переживёт переходы по сайту, но не F5
  }
}

/** Ключ для QR: сохранённый, если он ещё действует, иначе — новый с сервера. */
function getQr(forceNew) {
  if (!forceNew) {
    const saved = readSavedQr()
    if (saved) return Promise.resolve(saved)
  }
  pendingQr ??= startTelegramLogin()
    .then((data) => {
      const qr = { token: data.token, bot_link: data.bot_link, expiresAt: Date.now() + data.expires_in * 1000 }
      saveQr(qr)
      return qr
    })
    .finally(() => {
      pendingQr = null
    })
  return pendingQr
}

const secondsUntil = (moment) => Math.max(0, Math.round((moment - Date.now()) / 1000))

// Страница входа: QR-код на бота + запасной вариант — код из /login.
export default function LoginPage() {
  const { user, login, blocked } = useAuth()
  const navigate = useNavigate()

  // Состояние QR-входа
  const [session, setSession] = useState(null) // { token, bot_link, expiresAt }
  const [status, setStatus] = useState('loading') // loading | pending | declined | expired | error
  const [error, setError] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [attempt, setAttempt] = useState(0) // увеличиваем, чтобы получить новый QR

  // Состояние входа по коду
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(null)
  const [sendingCode, setSendingCode] = useState(false)

  function finishLogin(result) {
    saveQr(null) // ключ использован (или вход по коду) — больше не нужен
    login(result.access_token, result.user)
    navigate('/profile', { replace: true })
  }

  // 1. Ключ для QR: прежний, если ещё действует; новый — по кнопке «Показать новый код».
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError(null)
    getQr(attempt > 0)
      .then((qr) => {
        if (cancelled) return
        setSession(qr)
        setSecondsLeft(secondsUntil(qr.expiresAt))
        setStatus('pending')
      })
      .catch((e) => {
        if (cancelled) return
        setError(e.message)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  // 2. Пока ждём — каждые 2 секунды спрашиваем бэкенд, нажали ли «Да» в боте.
  useEffect(() => {
    if (status !== 'pending' || !session) return
    let cancelled = false
    let timer

    async function poll() {
      try {
        const result = await getLoginStatus(session.token)
        if (cancelled) return
        if (result.status === 'confirmed') return finishLogin(result)
        if (result.status !== 'pending') {
          saveQr(null) // устарел или отменён в боте — повторно не показываем
          return setStatus(result.status)
        }
      } catch {
        // сеть моргнула — просто попробуем ещё раз
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS)
    }

    timer = setTimeout(poll, POLL_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [status, session])

  // 3. Обратный отсчёт до истечения QR.
  useEffect(() => {
    if (status !== 'pending') return
    const timer = setInterval(() => {
      // Считаем от срока ключа, а не «минус секунда»: вкладка в фоне тикает реже.
      const left = secondsUntil(session.expiresAt)
      setSecondsLeft(left)
      if (left <= 0) {
        saveQr(null)
        setStatus('expired')
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [status, session])

  async function submitCode(event) {
    event.preventDefault()
    setSendingCode(true)
    setCodeError(null)
    try {
      finishLogin(await loginWithCode(code))
    } catch (e) {
      setCodeError(e.message)
    } finally {
      setSendingCode(false)
    }
  }

  if (user) return <Navigate to="/profile" replace />

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  return (
    <section className="login">
      <h1>Вход</h1>
      {blocked && <p className="error">Ваш аккаунт заблокирован администратором.</p>}
      <p className="muted">Через Telegram — без пароля.</p>

      <div className="login__grid">
        <div className="login__card">
          <h2>По QR-коду</h2>

          {status === 'loading' && <div className="qr qr--empty">Загрузка…</div>}

          {status === 'pending' && session && (
            <>
              <a href={session.bot_link} target="_blank" rel="noreferrer" className="qr">
                <QRCodeSVG value={session.bot_link} size={196} marginSize={2} />
              </a>
              <ol className="steps">
                <li>Отсканируйте код камерой телефона</li>
                <li>В боте нажмите «Да, войти»</li>
                <li>Эта страница откроет профиль сама</li>
              </ol>
              <a href={session.bot_link} target="_blank" rel="noreferrer" className="btn btn--ghost wide">
                Открыть бота на этом устройстве
              </a>
              <p className="muted small center">
                Код действует {minutes}:{seconds}
              </p>
            </>
          )}

          {(status === 'expired' || status === 'declined') && (
            <div className="qr qr--empty">
              <p>{status === 'expired' ? 'QR-код устарел.' : 'Вход отменён в боте.'}</p>
              <button className="btn" onClick={() => setAttempt((a) => a + 1)}>
                Показать новый код
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="qr qr--empty">
              <p className="error">{error}</p>
              <button className="btn btn--ghost" onClick={() => setAttempt((a) => a + 1)}>
                Повторить
              </button>
            </div>
          )}
        </div>

        <div className="login__card">
          <h2>По коду из бота</h2>
          <p className="muted small">
            Отправьте боту команду <code>/login</code> и введите 6 цифр, которые он пришлёт.
          </p>
          <form onSubmit={submitCode} className="code-form">
            <input
              className="code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''))
                setCodeError(null)
              }}
            />
            <button className="btn wide" disabled={code.length !== 6 || sendingCode}>
              {sendingCode ? 'Проверяем…' : 'Войти'}
            </button>
          </form>
          {codeError && <p className="error">{codeError}</p>}
        </div>
      </div>
    </section>
  )
}
