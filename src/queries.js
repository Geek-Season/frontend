// Запросы к API через кэш: какие данные, под каким ключом и сколько они «свежие».
//
// Ключ каждого запроса начинается с данных и id вошедшего пользователя (или 'guest'):
// ответы персональные (решено X из Y, статус задачи, место в рейтинге), и данные
// одного ученика никогда не покажутся другому, даже если они вошли в одном браузере.
// При выходе кэш очищается целиком (auth.jsx).

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'

import * as api from './api.js'
import { useAuth } from './auth.jsx'

export const TASKS_PAGE_SIZE = 20

/** id вошедшего пользователя или 'guest' — первая часть ключей персональных данных */
export function useMe() {
  const { user } = useAuth()
  return user ? user.id : 'guest'
}

// ---------- Ключи ----------

export const keys = {
  numbers: (me) => ['numbers', me],
  tasksOf: (me, code) => ['tasks', me, code],
  tasks: (me, code, filters) => ['tasks', me, code, filters],
  stats: (me) => ['stats', me],
  achievements: (me) => ['achievements', me],
  rating: (me, period) => ['rating', me, period],
  examCurrent: (me) => ['exam', me, 'current'],
  examHistory: (me) => ['exam', me, 'history'],
  exam: (me, id) => ['exam', me, 'one', String(id)],
  adminTasks: (me, code) => ['admin-tasks', me, code],
}

// ---------- Номера и задачи ----------

export function useNumbers() {
  const me = useMe()
  return useQuery({ queryKey: keys.numbers(me), queryFn: api.getNumbers })
}

/** Параметры списка задач номера — общие для страницы и для предзагрузки при наведении. */
export function tasksQueryOptions(me, code, { source = '', progress = '', sort = 'new' } = {}) {
  return {
    queryKey: keys.tasks(me, code, { source, progress, sort }),
    queryFn: ({ pageParam }) =>
      api.getNumberTasks(code, { source, progress, sort, limit: TASKS_PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    // Следующая порция начинается там, где закончились уже загруженные задачи.
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, page) => n + page.items.length, 0)
      return loaded < last.total ? loaded : undefined
    },
    // Ученик читает разбор и переключается в IDE и обратно — список не должен
    // перестраиваться у него на глазах (с фильтром «Нерешённые» решённая задача исчезла бы).
    refetchOnWindowFocus: false,
  }
}

export function useNumberTasks(code, filters) {
  const me = useMe()
  return useInfiniteQuery({
    ...tasksQueryOptions(me, code, filters),
    // Пока грузится новый фильтр того же номера — показываем прежний список, а не «Загрузка…».
    // Для другого номера — нет: задачи чужого номера на экране только запутают.
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2] === code ? previous : undefined),
  })
}

/** Предзагрузить задачи номера (при наведении на карточку) — переход откроется мгновенно. */
export function usePrefetchNumberTasks() {
  const me = useMe()
  const queryClient = useQueryClient()
  return (code) => queryClient.prefetchInfiniteQuery(tasksQueryOptions(me, code))
}

// ---------- Профиль и рейтинг ----------

export function useStats() {
  const me = useMe()
  return useQuery({ queryKey: keys.stats(me), queryFn: api.getMyStats, enabled: me !== 'guest' })
}

export function useAchievements() {
  const me = useMe()
  return useQuery({
    queryKey: keys.achievements(me),
    queryFn: api.getMyAchievements,
    enabled: me !== 'guest',
    // Достижения выдаёт фоновый воркер через секунду-другую после ответа — проверяем чаще.
    staleTime: 15 * 1000,
  })
}

export function useRating(period) {
  const me = useMe()
  return useQuery({ queryKey: keys.rating(me, period), queryFn: () => api.getRating(period), staleTime: 30 * 1000 })
}

// ---------- Пробник ----------

export function useCurrentExam() {
  const me = useMe()
  return useQuery({
    queryKey: keys.examCurrent(me),
    queryFn: api.getCurrentExam,
    enabled: me !== 'guest',
    // Идущий пробник — всегда с сервера: ответы и оставшееся время меняются каждую секунду,
    // а экран пробника берёт ответы из данных один раз при открытии.
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })
}

export function useExamHistory() {
  const me = useMe()
  return useQuery({ queryKey: keys.examHistory(me), queryFn: api.getExamHistory, enabled: me !== 'guest' })
}

export function useExam(id) {
  const me = useMe()
  return useQuery({
    queryKey: keys.exam(me, id),
    queryFn: () => api.getExam(id),
    enabled: me !== 'guest',
    // Завершённый пробник уже не изменится — его можно не перезапрашивать вовсе.
    staleTime: (query) => (query.state.data?.finished_at ? Infinity : 0),
  })
}

// ---------- Редактор ----------

export function useAdminTasks(code, enabled) {
  const me = useMe()
  return useQuery({
    queryKey: keys.adminTasks(me, code),
    queryFn: () => api.getNumberTasks(code, { sort: 'new', limit: 100 }),
    select: (page) => page.items,
    enabled,
  })
}

// ---------- Что обновить после изменений ----------

/** Хуки, которые помечают кэш устаревшим после действий ученика и админа. */
export function useInvalidate() {
  const me = useMe()
  const queryClient = useQueryClient()

  return {
    /**
     * Ученик ответил на задачу на странице номера: статус задачи и «решено X из Y»
     * обновляем на месте (без перезагрузки списка), остальное — пометить устаревшим.
     */
    taskChecked(currentKey, code, taskId, isCorrect) {
      let firstSolve = false
      queryClient.setQueryData(currentKey, (data) => {
        if (!data) return data
        const task = data.pages.flatMap((p) => p.items).find((t) => t.id === taskId)
        firstSolve = Boolean(isCorrect && task && task.status !== 'solved')
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            number: firstSolve ? { ...page.number, solved: page.number.solved + 1 } : page.number,
            items: page.items.map((t) =>
              t.id === taskId ? { ...t, status: isCorrect || t.status === 'solved' ? 'solved' : 'failed' } : t,
            ),
          })),
        }
      })
      if (me === 'guest') return // ответ гостя никуда не сохраняется

      if (firstSolve) {
        queryClient.setQueryData(keys.numbers(me), (numbers) =>
          numbers?.map((n) => (n.code === code ? { ...n, solved: n.solved + 1 } : n)),
        )
      }
      // Другие фильтры этого номера — устарели, но сейчас не на экране: перезапросятся при открытии.
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'tasks' && q.queryKey[1] === me && q.queryKey[2] === code
          && JSON.stringify(q.queryKey) !== JSON.stringify(currentKey),
      })
      queryClient.invalidateQueries({ queryKey: keys.stats(me) })
      queryClient.invalidateQueries({ queryKey: keys.achievements(me) })
      if (firstSolve) queryClient.invalidateQueries({ queryKey: ['rating', me] })
    },

    /** Пробник завершён: результат уже известен, всё остальное могло измениться. */
    examFinished(id, result) {
      if (result) queryClient.setQueryData(keys.exam(me, id), result)
      queryClient.setQueryData(keys.examCurrent(me), null)
      for (const key of [keys.examHistory(me), keys.stats(me), keys.achievements(me), keys.numbers(me),
        ['tasks', me], ['rating', me]]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },

    /** Админ изменил банк задач: списки номеров и задач у всех страниц устарели. */
    bankChanged() {
      for (const key of [['numbers'], ['tasks'], ['admin-tasks'], ['stats']]) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  }
}
