// Значок ранга — медаль в духе медалей Доты, но со своими рисунками:
// металлический обод, тёмный диск с эмблемой темы ранга, свечение и звёзды.
// Чем выше ранг, тем ярче металл и сильнее свечение; у двух верхних — крылья-лавры.

import { useId } from 'react'

export const RANK_STYLE = {
  recruit: { metal: ['#c9b48a', '#7a6440'], disc: '#2a2418', glow: 0, accent: '#e8d4a6' },
  knight: { metal: ['#e4ebf2', '#7d8b99'], disc: '#1b2430', glow: 0.12, accent: '#cfe0f0' },
  hero: { metal: ['#9cf0e8', '#2f8f8a'], disc: '#0f2a2c', glow: 0.2, accent: '#8ff3e6' },
  legend: { metal: ['#9ff0b4', '#2d8c4e'], disc: '#0f2a19', glow: 0.26, accent: '#a6f5bd' },
  overlord: { metal: ['#ffe39a', '#b8862b'], disc: '#2e2108', glow: 0.32, accent: '#ffd76a' },
  divine: { metal: ['#f3c8ff', '#8b4cc4'], disc: '#24113a', glow: 0.4, accent: '#ffd76a' },
  immortal: { metal: ['#ffb3a8', '#b3262f'], disc: '#330b10', glow: 0.5, accent: '#ffd76a' },
}

/** rank — { key }; stars — сколько звёзд горит; slots — сколько всего (0 — без звёзд). */
export default function RankMedal({ rank, size = 96, stars = 0, slots = 0, locked = false, title }) {
  const id = useId().replace(/:/g, '')
  const key = locked ? 'locked' : rank?.key ?? 'recruit'
  const style = RANK_STYLE[key] ?? { metal: ['#3a4157', '#232838'], disc: '#171b27', glow: 0, accent: '#8b92a8' }
  const winged = key === 'divine' || key === 'immortal'
  const label = title ?? (locked ? 'Ранг не определён' : rank?.title)

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={label} className="rank-medal">
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={style.metal[0]} />
          <stop offset="1" stopColor={style.metal[1]} />
        </linearGradient>
        <radialGradient id={`d${id}`} cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor={style.accent} stopOpacity="0.28" />
          <stop offset="1" stopColor={style.disc} />
        </radialGradient>
        <radialGradient id={`g${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor={style.metal[0]} stopOpacity={style.glow} />
          <stop offset="1" stopColor={style.metal[0]} stopOpacity="0" />
        </radialGradient>
      </defs>
      {style.glow > 0 && <circle cx="60" cy="56" r="58" fill={`url(#g${id})`} />}
      {winged && <Wings fill={`url(#m${id})`} />}
      <circle cx="60" cy="56" r="40" fill={`url(#d${id})`} stroke={`url(#m${id})`} strokeWidth="7" />
      <circle cx="60" cy="56" r="33" fill="none" stroke={style.metal[1]} strokeOpacity="0.6" strokeWidth="1.5" />
      <g fill="none" stroke={style.accent} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <Emblem rank={key} accent={style.accent} />
      </g>
      {slots > 0 && <Stars stars={stars} slots={slots} color={style.metal[0]} />}
    </svg>
  )
}

function Emblem({ rank, accent }) {
  switch (rank) {
    case 'recruit': // «ворд»: страница с буквой W
      return (
        <>
          <path d="M46 36 h22 l8 8 v30 h-30 z" />
          <path d="M51 50 l4 14 l5 -10 l5 10 l4 -14" />
        </>
      )
    case 'knight': // черепаха
      return (
        <>
          <ellipse cx="58" cy="58" rx="15" ry="11" />
          <path d="M48 58 h20 M53 49 l-3 9 l3 9 M63 49 l3 9 l-3 9" strokeWidth="2.5" />
          <circle cx="78" cy="54" r="4.5" />
          <path d="M47 66 l-4 5 M69 66 l4 5 M47 50 l-4 -4 M43 58 h-5" />
        </>
      )
    case 'hero': // рекурсия: спираль со стрелкой
      return (
        <>
          <path d="M60 40 a16 16 0 1 1 -15.5 20" />
          <path d="M60 48 a8 8 0 1 1 -7.5 10" />
          <path d="M41 54 l3.5 6.5 l6 -4" />
        </>
      )
    case 'legend': // эксель: таблица
      return (
        <>
          <rect x="42" y="40" width="36" height="32" rx="3" />
          <path d="M42 51 h36 M42 61 h36 M54 40 v32 M66 40 v32" strokeWidth="2.5" />
          <path d="M56 63 l4 7 l4 -7" stroke="none" />
        </>
      )
    case 'overlord': // теория игр: корона над доской
      return (
        <>
          <path d="M42 66 l-2 -24 l11 10 l9 -14 l9 14 l11 -10 l-2 24 z" />
          <path d="M44 72 h32" />
        </>
      )
    case 'divine': // 24 и 25: сияющая звезда с нимбом
      return (
        <>
          <ellipse cx="60" cy="38" rx="12" ry="3.5" strokeWidth="2.5" />
          <path d="M60 44 l4.5 10 l11 1 l-8.5 7 l2.8 11 l-9.8 -6 l-9.8 6 l2.8 -11 l-8.5 -7 l11 -1 z" fill={accent} fillOpacity="0.25" />
        </>
      )
    case 'immortal': // бесконечность
      return <path d="M60 56 c-6 -9 -18 -9 -18 0 s12 9 18 0 s12 -9 18 0 s-12 9 -18 0" strokeWidth="4.5" />
    default: // ранга ещё нет
      return <path d="M53 48 a7 7 0 1 1 9 7 v5 M60 68 v0.5" />
  }
}

function Wings({ fill }) {
  const leaf = 'M0 0 c-8 -3 -12 -10 -12 -17 c6 2 11 8 12 17 z'
  const left = [0, 1, 2, 3].map((i) => (
    <path key={i} d={leaf} transform={`translate(${24 - i * 1.5} ${84 - i * 13}) rotate(${-25 - i * 14})`} />
  ))
  return (
    <g fill={fill} opacity="0.9">
      {left}
      <g transform="translate(120 0) scale(-1 1)">{left}</g>
    </g>
  )
}

function Stars({ stars, slots, color }) {
  const star = 'M0 -6 l1.8 3.8 l4.1 0.5 l-3 2.8 l0.8 4.1 l-3.7 -2 l-3.7 2 l0.8 -4.1 l-3 -2.8 l4.1 -0.5 z'
  return (
    <g>
      {Array.from({ length: slots }, (_, i) => {
        // по дуге под диском
        const angle = Math.PI / 2 - (i - (slots - 1) / 2) * 0.32 // слева направо
        const x = 60 + Math.cos(angle) * 49
        const y = 56 + Math.sin(angle) * 49 + 6
        const on = i < stars
        return (
          <path
            key={i}
            d={star}
            transform={`translate(${x} ${y})`}
            fill={on ? color : '#0b0d14'}
            stroke={on ? '#fff6' : color}
            strokeOpacity={on ? 1 : 0.5}
            strokeWidth="0.8"
          />
        )
      })}
    </g>
  )
}
