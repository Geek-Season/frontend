import { useEffect, useRef, useState } from 'react'

// Анимация из символов в окошке «терминала» на главной.
// Сейчас — вращающийся «пончик» (классика donut.c, считается на лету, без файлов).
// Позже сюда можно подставить готовые кадры (массив строк) — например, своего персонажа.

const W = 56
const H = 26
const SHADES = '.,-~:;=!*#$@'
const FPS = 20

function donut(A, B) {
  const out = new Array(W * H).fill(' ')
  const depth = new Array(W * H).fill(0)
  const cA = Math.cos(A); const sA = Math.sin(A)
  const cB = Math.cos(B); const sB = Math.sin(B)
  for (let j = 0; j < 6.28; j += 0.07) {
    const ct = Math.cos(j); const st = Math.sin(j)
    for (let i = 0; i < 6.28; i += 0.02) {
      const sp = Math.sin(i); const cp = Math.cos(i)
      const h = ct + 2
      const D = 1 / (sp * h * sA + st * cA + 5)
      const t = sp * h * cA - st * sA
      const x = Math.floor(W / 2 + W * 0.38 * D * (cp * h * cB - t * sB))
      const y = Math.floor(H / 2 + H * 0.62 * D * (cp * h * sB + t * cB))
      const o = x + W * y
      const N = Math.floor(8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB))
      if (y >= 0 && y < H && x >= 0 && x < W && D > depth[o]) {
        depth[o] = D
        out[o] = SHADES[N > 0 ? N : 0]
      }
    }
  }
  let text = ''
  for (let row = 0; row < H; row++) text += out.slice(row * W, row * W + W).join('') + '\n'
  return text
}

export default function AsciiAnimation({ title = '~/geek-season — ascii.sh' }) {
  const pre = useRef(null)
  const [paused, setPaused] = useState(false)
  const angle = useRef({ A: 1.1, B: 0.6 })

  useEffect(() => {
    if (pre.current) pre.current.textContent = donut(angle.current.A, angle.current.B)
    // Кто в системе отключил анимации — видит неподвижный кадр.
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (paused || still) return undefined
    let raf
    let last = 0
    const tick = (now) => {
      raf = requestAnimationFrame(tick) // во вкладке на фоне браузер сам не вызывает — батарею не тратит
      if (now - last < 1000 / FPS) return
      last = now
      angle.current.A += 0.07
      angle.current.B += 0.035
      if (pre.current) pre.current.textContent = donut(angle.current.A, angle.current.B)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused])

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
