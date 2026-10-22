// Все обращения к бэкенду собраны здесь.
// Страницы не знают адресов API — они просто вызывают эти функции.

const BASE = '/api'

async function request(path, options = {}) {
  const response = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    // FastAPI кладёт текст ошибки в поле detail.
    let message = `Ошибка ${response.status}`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') message = body.detail
      else if (Array.isArray(body.detail)) message = 'Проверьте формат ответа'
    } catch {
      // тело не JSON — оставляем общее сообщение
    }
    throw new Error(message)
  }

  return response.status === 204 ? null : response.json()
}

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
