import { useEffect, useRef, useState } from 'react'

// Анимация из символов в окошке «терминала» на главной: свой персонаж Geek Season —
// девочка-гик в наушниках за ноутбуком и спящий кот. Кадры готовые (scripts/ascii/README.md),
// лежат отдельным файлом и грузятся после страницы — главная открывается без задержки.

const FPS = 8

export default function AsciiAnimation({ title = '~/geek-season — ascii.sh' }) {
  const pre = useRef(null)
  const [frames, setFrames] = useState(null)
  const [paused, setPaused] = useState(false)
  const index = useRef(0)

  useEffect(() => {
    let alive = true
    import('../assets/ascii-girl.json').then((m) => { if (alive) setFrames(m.default) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!frames || !pre.current) return undefined
    pre.current.textContent = frames[index.current % frames.length]
    // Крутится всегда, даже при «уменьшить движение» в системе (так решили: анимация — часть главной).
    // Остановить можно кликом по окну.
    if (paused) return undefined
    let raf
    let last = 0
    const tick = (now) => {
      raf = requestAnimationFrame(tick) // во вкладке на фоне браузер сам не вызывает — батарею не тратит
      if (now - last < 1000 / FPS) return
      last = now
      index.current = (index.current + 1) % frames.length
      if (pre.current) pre.current.textContent = frames[index.current]
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [frames, paused])

  return (
    <div className="term">
      <div className="term__bar" aria-hidden="true">
        <i /><i /><i />
        <span>{title}</span>
      </div>
      <button
        type="button"
        className="term__screen"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? 'Запустить анимацию' : 'Остановить анимацию'}
        title={paused ? 'Запустить' : 'Пауза'}
      >
        <pre ref={pre} aria-hidden="true" />
      </button>
    </div>
  )
}
