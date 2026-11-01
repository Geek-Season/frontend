import { useEffect, useState } from 'react'

import { updateSite } from '../../api.js'
import { useInvalidate, useSite } from '../../queries.js'

// Вкладка «Сайт»: дата ЕГЭ по информатике для счётчика «До ЕГЭ — N дней» на главной.
export default function SiteTab() {
  const site = useSite()
  const invalidate = useInvalidate()
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { setDate(site.data?.exam_date ?? '') }, [site.data])

  async function save(value) {
    setBusy(true)
    setMessage(null)
    try {
      await updateSite({ exam_date: value || null })
      invalidate.siteChanged()
      setMessage({ type: 'ok', text: value ? 'Дата ЕГЭ сохранена' : 'Счётчик до ЕГЭ убран с главной' })
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <h2 className="panel__title">Дата ЕГЭ по информатике</h2>
      <p className="muted small panel__hint">
        По ней на главной считается «До ЕГЭ по информатике — N дней». Пусто — счётчика нет.
        Дата из официального расписания Рособрнадзора (обычно публикуют зимой).
      </p>
      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); save(date) }}>
        <input className="input input--date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Дата ЕГЭ" />
        <button className="btn btn--small" disabled={busy || date === (site.data?.exam_date ?? '')}>Сохранить</button>
        {site.data?.exam_date && (
          <button type="button" className="btn btn--ghost btn--small" disabled={busy} onClick={() => { setDate(''); save('') }}>
            Убрать счётчик
          </button>
        )}
      </form>
      {message && <p className={message.type === 'error' ? 'error' : 'success'} role="status">{message.text}</p>}
    </div>
  )
}
