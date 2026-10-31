// Поздравление с новым рангом — окно поверх страницы, как повышение медали в Доте.
// Вызывается из любого места: announceRankUp(rank) (ответ на задачу, завершение пробника);
// само окно одно — <RankUpHost /> в Layout.

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import RankMedal from './RankMedal.jsx'

const EVENT = 'geek-season:rank-up'

// С какого тестового балла начинается ранг — для подписи «прогноз на ЕГЭ — от N баллов».
const FROM_SCORE = { recruit: 0, knight: 40, hero: 51, legend: 62, overlord: 72, divine: 80, immortal: 93 }

/** rank — { key, title, short }; first — это первый ранг после входного пробника. */
export function announceRankUp(rank, { first = false } = {}) {
  if (rank) window.dispatchEvent(new CustomEvent(EVENT, { detail: { rank, first } }))
}

export function RankUpHost() {
  const [shown, setShown] = useState(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const onRankUp = (event) => {
      setShown(event.detail)
      // Ранг виден в рейтинге и в карточке профиля — обновить.
      queryClient.invalidateQueries({ queryKey: ['rating'] })
      queryClient.invalidateQueries({ queryKey: ['rank'] })
    }
    window.addEventListener(EVENT, onRankUp)
    return () => window.removeEventListener(EVENT, onRankUp)
  }, [queryClient])

  useEffect(() => {
    if (!shown) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setShown(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shown])

  if (!shown) return null
  const { rank, first } = shown
  const from = FROM_SCORE[rank.key]
  return (
    <div className="modal modal--center" onMouseDown={(e) => { if (e.target === e.currentTarget) setShown(null) }}>
      <div className="modal__sheet rank-up" role="dialog" aria-modal="true" aria-labelledby="rank-up-title">
        <div className="rank-up__medal"><RankMedal rank={rank} size={168} /></div>
        <p className="rank-up__kicker">{first ? 'Входной пробник пройден — ваш первый ранг' : 'Новый ранг!'}</p>
        <h2 id="rank-up-title" className="rank-up__title">{rank.title}</h2>
        <p className="muted">
          {from ? `Прогноз на ЕГЭ — от ${from} ${from % 10 === 1 && from % 100 !== 11 ? 'балла' : 'баллов'}. ` : ''}
          Другие ученики видят ваш ранг в рейтинге.
        </p>
        <button type="button" className="btn" onClick={() => setShown(null)} autoFocus>Круто!</button>
      </div>
    </div>
  )
}
