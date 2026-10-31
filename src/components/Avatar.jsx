// Аватарка: фото (из Telegram или своё), а если его нет — первая буква имени в кружке.

import { useState } from 'react'

import { fileUrl } from '../api.js'

/** url — /avatars/… из API или blob: (предпросмотр); size — 'small' | 'large' | обычная. */
export default function Avatar({ name = '', url, size, className = '' }) {
  const [broken, setBroken] = useState(null) // адрес, который не загрузился
  const src = url && (url.startsWith('blob:') ? url : fileUrl({ url }))
  const classes = `avatar ${size ? `avatar--${size}` : ''} ${className}`
  if (src && broken !== src) {
    return <img className={`${classes} avatar--photo`} src={src} alt="" onError={() => setBroken(src)} />
  }
  return <span className={classes} aria-hidden="true">{name.slice(0, 1).toUpperCase() || '?'}</span>
}
