import { useState } from 'react'
import { Link } from 'react-router-dom'

import { displayName, useAuth } from '../auth.jsx'
import AsciiAnimation from '../components/AsciiAnimation.jsx'
import { useSite } from '../queries.js'

// Главная: приветствие (как «Any thoughts, Alex?» у Claude), счётчик до ЕГЭ и анимация из символов.
// Гостю — коротко о сайте и вход.

const PHRASES = [
  'Чем займёмся сегодня?',
  'Рекурсия сама себя не решит.',
  'Каждый день — минус одна непонятная тема.',
  'Одна задача лучше, чем ни одной.',
  'Сегодня отличный день для 27-го номера.',
  'Маски и делители уже заждались.',
  'Черепаха ползёт, а ты решай.',
  'Пара задач — и серия продолжается.',
]

function greeting(hour) {
  if (hour >= 5 && hour < 12) return 'Доброе утро'
  if (hour >= 12 && hour < 17) return 'Добрый день'
  if (hour >= 17 && hour < 23) return 'Добрый вечер'
  return 'Доброй ночи'
}

function plural(n, one, few, many) {
  const tail = n % 100
  if (tail >= 11 && tail <= 14) return many
  if (n % 10 === 1) return one
  if (n % 10 >= 2 && n % 10 <= 4) return few
  return many
}

/** Сколько дней до даты ЕГЭ (по календарю, в часовом поясе браузера). null — дата не задана или прошла. */
function daysUntil(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((new Date(y, m - 1, d) - today) / 86400000)
  return days >= 0 ? days : null
}

function Countdown() {
  const days = daysUntil(useSite().data?.exam_date)
  if (days == null) return null
  return (
    <div className="home__facts">
      <span className="home__fact">
        <span aria-hidden="true">⏳</span>
        {days === 0 ? (
          <span><b>ЕГЭ по информатике — сегодня.</b><br /><span className="muted small">Удачи!</span></span>
        ) : (
          <span>До ЕГЭ по информатике<br /><b className="home__count">{days} {plural(days, 'день', 'дня', 'дней')}</b></span>
        )}
      </span>
    </div>
  )
}

export default function HomePage() {
  const { user, checking } = useAuth()
  // Фраза выбирается при открытии страницы и не меняется, пока страница открыта.
  const [phrase] = useState(() => PHRASES[Math.floor(Math.random() * PHRASES.length)])

  if (checking) return <p className="muted">Загрузка…</p>

  return (
    <section className="home">
      <div className="home__text">
        {user ? (
          <>
            <h1 className="home__hello">{greeting(new Date().getHours())},<br /><span>{displayName(user)}</span></h1>
            <p className="home__sub">{phrase}</p>
            <Countdown />
            <div className="home__cta">
              <Link to="/tasks" className="btn">Решать задания</Link>
              <Link to="/exam" className="btn btn--ghost">Пробник</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="home__hello">Подготовка к ЕГЭ<br />по <span>информатике</span></h1>
            <p className="home__sub">
              Все 27 номеров с разборами, пробники с таймером, подробная аналитика, тренировка слабых мест,
              собственная система рейтинга.
            </p>
            <Countdown />
            <div className="home__cta">
              <Link to="/login" className="btn">Войти через Telegram</Link>
              <Link to="/tasks" className="btn btn--ghost">Посмотреть задания</Link>
            </div>
          </>
        )}
      </div>
      <AsciiAnimation />
    </section>
  )
}
