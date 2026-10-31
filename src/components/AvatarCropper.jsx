// Обрезка аватарки до квадрата: ученик двигает картинку и меняет масштаб,
// сайт сам рисует квадрат 512×512 и отправляет его на сервер (JPEG, десятки КБ).
// Без библиотек: картинка в квадратном окне, перетаскивание — указателем (мышь и палец).

import { useEffect, useRef, useState } from 'react'

const VIEW = 260 // сторона окна обрезки на экране, px
const OUT = 512 // сторона итоговой картинки, px

export default function AvatarCropper({ file, onDone, onCancel }) {
  const [img, setImg] = useState(null)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 }) // левый верхний угол картинки в окне
  const drag = useRef(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setImg(image)
      const scale = Math.max(VIEW / image.width, VIEW / image.height)
      setPos({ x: (VIEW - image.width * scale) / 2, y: (VIEW - image.height * scale) / 2 })
    }
    image.onerror = () => setError('Не удалось открыть картинку. Подойдут PNG, JPEG и WebP.')
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const base = img ? Math.max(VIEW / img.width, VIEW / img.height) : 1 // «вписать по меньшей стороне»
  const scale = base * zoom
  const clamp = (p, s = scale) => img
    ? {
      x: Math.min(0, Math.max(VIEW - img.width * s, p.x)),
      y: Math.min(0, Math.max(VIEW - img.height * s, p.y)),
    }
    : p

  function changeZoom(next) {
    // Масштаб меняется относительно центра окна — то, что в центре, остаётся в центре.
    const nextScale = base * next
    const cx = (VIEW / 2 - pos.x) / scale
    const cy = (VIEW / 2 - pos.y) / scale
    setZoom(next)
    setPos(clamp({ x: VIEW / 2 - cx * nextScale, y: VIEW / 2 - cy * nextScale }, nextScale))
  }

  function onPointerDown(event) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, start: pos }
  }
  function onPointerMove(event) {
    if (!drag.current) return
    const { x, y, start } = drag.current
    setPos(clamp({ x: start.x + event.clientX - x, y: start.y + event.clientY - y }))
  }

  function finish() {
    const canvas = document.createElement('canvas')
    canvas.width = OUT
    canvas.height = OUT
    const size = VIEW / scale
    canvas.getContext('2d').drawImage(img, -pos.x / scale, -pos.y / scale, size, size, 0, 0, OUT, OUT)
    canvas.toBlob((blob) => onDone(blob), 'image/jpeg', 0.9)
  }

  if (error) {
    return (
      <div className="cropper">
        <p className="error small">{error}</p>
        <button type="button" className="btn btn--ghost btn--small" onClick={onCancel}>Назад</button>
      </div>
    )
  }

  return (
    <div className="cropper">
      <div
        className="cropper__view"
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null }}
        aria-label="Перетащите картинку, чтобы выбрать, что попадёт в аватарку"
      >
        {img && (
          <img
            src={img.src}
            alt=""
            draggable={false}
            style={{ width: img.width * scale, height: img.height * scale, transform: `translate(${pos.x}px, ${pos.y}px)` }}
          />
        )}
        <div className="cropper__ring" />
      </div>
      <label className="cropper__zoom">
        <span className="small muted">Масштаб</span>
        <input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} disabled={!img} />
      </label>
      <div className="btns">
        <button type="button" className="btn btn--small" onClick={finish} disabled={!img}>Готово</button>
        <button type="button" className="btn btn--ghost btn--small" onClick={onCancel}>Отмена</button>
      </div>
    </div>
  )
}
