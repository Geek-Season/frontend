// Все обращения к бэкенду собраны здесь.
// Страницы не знают адресов API — они просто вызывают эти функции.

// Адрес API. При разработке — /api: Vite пересылает такие запросы бэкенду (vite.config.js).
// На GitHub Pages сайт и API на разных адресах: адрес API задаётся при сборке
// переменной VITE_API_URL, например https://neyman-inf.netrun.io
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

// Токен вошедшего пользователя. Его выставляет auth.jsx после входа.
let authToken = null
export function setAuthToken(token) {
  authToken = token
}

// Что делать, если сервер ответил 401 на запрос с токеном (токен истёк или
// пользователь удалён). auth.jsx подставляет сюда выход из аккаунта.
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, options = {}) {
  // Content-Type — только когда есть JSON-тело. Файлы (FormData) — без него: заголовок
  // с границей частей браузер поставит сам. У GET тела нет, и без лишнего заголовка
  // запрос гостя «простой»: браузер не шлёт перед ним проверочный OPTIONS (CORS).
  const headers = typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const response = await fetch(BASE + path, { headers, ...options })

  if (response.status === 401 && headers.Authorization) {
    // Токен больше не действует: выходим, чтобы сайт не делал вид, что ученик вошёл,
    // а его ответы не терялись молча.
    onUnauthorized?.()
  }

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

/**
 * Проверка ответа: { is_correct, correct_answer, explanation, parts }.
 * answer — строка для обычной задачи или объект {"19": "…", "20": "…", "21": "…"} для 19–21.
 */
export function checkAnswer(taskId, answer) {
  return request(`/tasks/${taskId}/check`, {
    method: 'POST',
    body: JSON.stringify(typeof answer === 'string' ? { answer } : { answers: answer }),
  })
}

/**
 * Правильный ответ и разбор: { correct_answer, explanation, parts: [{ number, correct_answer, explanation }] }.
 * Сервер отдаёт их, только когда задача решена или неверных ответов набралось три (иначе 403).
 */
export function getSolution(taskId) {
  return request(`/tasks/${taskId}/solution`)
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

/**
 * Загрузить к задаче картинку (kind = 'image') или файл к заданию (kind = 'attachment').
 * Ответ: { id, kind, name, url, size, content_type }
 */
export function uploadTaskFile(taskId, file, kind) {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  return request(`/tasks/${taskId}/files`, { method: 'POST', body: form })
}

export function deleteTaskFile(taskId, fileId) {
  return request(`/tasks/${taskId}/files/${fileId}`, { method: 'DELETE' })
}

// ---------- Картинки и файлы ----------

/** Полный адрес картинки или файла: API отдаёт путь вида /files/…, сайт ходит к API через /api */
export function fileUrl(file) {
  return BASE + file.url
}

// ---------- Достижения ----------

/** Все достижения: received_at — дата получения или null */
export function getMyAchievements() {
  return request('/me/achievements')
}
