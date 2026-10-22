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
      else if (Array.isArray(body.detail)) {
        // 422 от FastAPI: список ошибок по полям — показываем первую понятно.
        const first = body.detail[0]
        const field = first?.loc?.[first.loc.length - 1]
        message = field ? `Проверьте поле «${field}»: ${first.msg}` : 'Проверьте формат данных'
      }
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
export function getNumberTasks(code, { source, progress, sort, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams({ sort, limit, offset })
  if (source) params.set('source', source)
  if (progress) params.set('progress', progress) // solved | unsolved — только для вошедших
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

// ---------- Прогресс ----------

/** Статистика вошедшего ученика (см. /docs → Прогресс → /me/stats) */
export function getMyStats() {
  return request('/me/stats')
}

// ---------- Пробник ----------

/** Начать пробник или получить уже идущий */
export function startExam() {
  return request('/exam/start', { method: 'POST' })
}

/** Идущий пробник или null, если его нет */
export function getCurrentExam() {
  return request('/exam/current')
}

export function getExam(id) {
  return request(`/exam/${id}`)
}

export function getExamHistory() {
  return request('/exam/history')
}

/** Автосохранение ответа; пустая строка стирает ответ */
export function saveExamAnswer(examId, position, answer) {
  return request(`/exam/${examId}/answers/${position}`, {
    method: 'PUT',
    body: JSON.stringify({ answer }),
  })
}

export function finishExam(examId) {
  return request(`/exam/${examId}/finish`, { method: 'POST' })
}

// ---------- Рейтинг ----------

/** period: 'week' | 'all' */
export function getRating(period) {
  return request(`/rating?period=${period}`)
}

// ---------- Редактор задач (только админ) ----------

/** Задача целиком, с ответом и разбором */
export function getTaskFull(id) {
  return request(`/tasks/${id}/admin`)
}

export function createTask(data) {
  return request('/tasks', { method: 'POST', body: JSON.stringify(data) })
}

export function updateTask(id, data) {
  return request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

/** Убрать в архив (задача пропадёт из списков, статистика сохранится) */
export function archiveTask(id) {
  return request(`/tasks/${id}`, { method: 'DELETE' })
}
