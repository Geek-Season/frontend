// Все обращения к бэкенду собраны здесь.
// Страницы не знают адресов API — они просто вызывают эти функции.

const BASE = '/api'

// Токен вошедшего пользователя. Его выставляет auth.jsx после входа.
let authToken = null
export function setAuthToken(token) {
  authToken = token
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const response = await fetch(BASE + path, { headers, ...options })

  if (!response.ok) {
    // FastAPI кладёт текст ошибки в поле detail.
    let message = `Ошибка ${response.status}`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail)) message = 'Проверьте формат данных'
    } catch {
      // тело не JSON — оставляем общее сообщение
    }
    throw new ApiError(message, response.status)
  }

  return response.status === 204 ? null : response.json()
}

// ---------- Задания ----------

/** Карточки номеров ЕГЭ: [{ code, title, tasks_count }] */
export function getNumbers() {
  return request('/numbers')
}

/** Прототипы номера: { number, total, items } */
export function getNumberTasks(code, { source, sort, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ sort, limit, offset })
  if (source) params.set('source', source)
  return request(`/numbers/${encodeURIComponent(code)}/tasks?${params}`)
}

/** Проверка ответа: { is_correct, correct_answer, explanation } */
export function checkAnswer(taskId, answer) {
  return request(`/tasks/${taskId}/check`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
  })
}

// ---------- Вход ----------

/** Ключ для QR: { token, bot_link, expires_in } */
export function startTelegramLogin() {
  return request('/auth/telegram/start', { method: 'POST' })
}

/** { status: pending | declined | expired | confirmed, access_token?, user? } */
export function getLoginStatus(token) {
  return request(`/auth/telegram/status/${encodeURIComponent(token)}`)
}

/** Вход по коду из бота: { access_token, user } */
export function loginWithCode(code) {
  return request('/auth/code', { method: 'POST', body: JSON.stringify({ code }) })
}

/** Кто я: { id, first_name, last_name, username, created_at } */
export function getMe() {
  return request('/auth/me')
}
