// Окно «Настройки профиля» (шестерёнка в профиле): аватарка, имя на сайте, пол.
// Изменения применяются кнопкой «Сохранить»; «Отмена», Esc или клик мимо окна — ничего не меняют.

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { getMe, resetMyAvatar, updateProfile, uploadAvatar } from '../api.js'
import { useAuth } from '../auth.jsx'
import Avatar from './Avatar.jsx'
import AvatarCropper from './AvatarCropper.jsx'

const NAME_MIN = 3
const NAME_MAX = 20
const MAX_SOURCE_MB = 15 // исходник до обрезки; на сервер уходит квадрат 512×512
const GENDERS = [
  { value: 'm', label: 'М' },
  { value: 'f', label: 'Ж' },
  { value: null, label: 'Не указан' },
]

function nameError(value) {
  const name = value.trim().replace(/\s+/g, ' ')
  if (!name) return null // пусто — имя из Telegram
  if (name.length < NAME_MIN || name.length > NAME_MAX) return `От ${NAME_MIN} до ${NAME_MAX} символов`
  if (!/^[\p{L}\p{N}_-]+( [\p{L}\p{N}_-]+)*$/u.test(name)) return 'Только буквы, цифры, пробел, «_» и «-»'
  if (!/[\p{L}\p{N}]/u.test(name)) return 'Нужна хотя бы одна буква или цифра'
  return null
}

export default function ProfileSettings({ onClose }) {
  const { user, updateUser } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState(user.nickname ?? '')
  const [gender, setGender] = useState(user.gender ?? null)
  // Аватарка: null — не трогаем; { blob, preview } — новая своя; 'telegram' — вернуть фото из Telegram.
  const [avatar, setAvatar] = useState(null)
  const [cropping, setCropping] = useState(null) // выбранный файл, пока его обрезают
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileInput = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden' // страница под окном не прокручивается
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, saving])

  useEffect(() => () => { if (avatar?.preview) URL.revokeObjectURL(avatar.preview) }, [avatar])

  const cleanName = name.trim().replace(/\s+/g, ' ')
  const localError = nameError(name)
  const nameChanged = cleanName !== (user.nickname ?? '')
  const genderChanged = gender !== (user.gender ?? null)
  const changed = nameChanged || genderChanged || avatar !== null

  // Что сейчас на аватарке в окне
  const preview = avatar === 'telegram' ? null : avatar?.preview ?? user.avatar_url
  const avatarTitle = avatar === 'telegram'
    ? 'Фото из Telegram'
    : avatar ? 'Новая картинка' : user.has_custom_avatar ? 'Своя картинка' : user.avatar_url ? 'Фото из Telegram' : 'Без фото'
  const avatarHint = avatar === 'telegram'
    ? 'Появится через пару секунд после сохранения. Если фото скрыто в Telegram — будет буква.'
    : user.avatar_url || avatar ? 'PNG, JPEG или WebP — обрежете до квадрата' : 'Фото в Telegram нет или оно скрыто настройками приватности'
  const canReturnTelegram = (user.has_custom_avatar && avatar !== 'telegram') || (avatar && avatar !== 'telegram')

  function pickFile(file) {
    setError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Нужна картинка: PNG, JPEG или WebP')
    if (file.size > MAX_SOURCE_MB * 1024 * 1024) return setError(`Картинка больше ${MAX_SOURCE_MB} МБ`)
    setCropping(file)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      let me = user
      const changes = {}
      if (nameChanged) changes.nickname = cleanName || null
      if (genderChanged) changes.gender = gender
      if (Object.keys(changes).length) me = await updateProfile(changes)
      if (avatar === 'telegram') {
        me = await resetMyAvatar()
        // Сервер скачивает фото из Telegram в фоне — заберём его чуть позже.
        setTimeout(() => getMe().then(updateUser).catch(() => {}), 2500)
      } else if (avatar) {
        me = await uploadAvatar(avatar.blob)
      }
      updateUser(me)
      queryClient.invalidateQueries({ queryKey: ['rating'] }) // в рейтинге — новое имя и аватарка
      onClose()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="modal__sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal__head">
          <h2 id="settings-title">Настройки профиля</h2>
          <button type="button" className="modal__close" aria-label="Закрыть" onClick={onClose} disabled={saving}>×</button>
        </div>

        <div className="modal__body">
          <h3 className="settings__title">Аватарка</h3>
          {cropping ? (
            <AvatarCropper
              file={cropping}
              onCancel={() => setCropping(null)}
              onDone={(blob) => {
                setAvatar({ blob, preview: URL.createObjectURL(blob) })
                setCropping(null)
              }}
            />
          ) : (
            <div className="settings__avatar">
              <Avatar name={cleanName || user.first_name} url={preview} size="large" />
              <div>
                <div className="settings__label">{avatarTitle}</div>
                <div className="small muted">{avatarHint}</div>
                <div className="btns">
                  <button type="button" className="btn btn--small" onClick={() => fileInput.current?.click()} disabled={saving}>
                    Загрузить своё
                  </button>
                  {canReturnTelegram && (
                    <button type="button" className="btn btn--ghost btn--small" onClick={() => setAvatar(user.has_custom_avatar ? 'telegram' : null)} disabled={saving}>
                      {user.has_custom_avatar ? 'Вернуть фото из Telegram' : 'Не менять'}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => { pickFile(e.target.files[0]); e.target.value = '' }}
                />
              </div>
            </div>
          )}

          <h3 className="settings__title">Имя на сайте</h3>
          <div className="settings__name">
            <input
              className="settings__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={user.first_name}
              maxLength={NAME_MAX + 10}
              aria-label="Имя на сайте"
              autoComplete="off"
              disabled={saving}
            />
            {user.nickname !== null && cleanName !== '' && (
              <button type="button" className="link-button" onClick={() => setName('')} disabled={saving}>
                Вернуть имя из Telegram
              </button>
            )}
          </div>
          <p className={`small settings__note ${localError ? 'error' : 'muted'}`}>
            {localError || `Видят все: в рейтинге и вверху сайта. ${NAME_MIN}–${NAME_MAX} символов: буквы, цифры, пробел, «_» и «-». Пусто — имя из Telegram (${user.first_name}).`}
          </p>

          <h3 className="settings__title">Пол</h3>
          <div className="settings__gender">
            <span className="small muted">Нигде не показывается</span>
            <div className="segmented" role="radiogroup" aria-label="Пол">
              {GENDERS.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  role="radio"
                  aria-checked={gender === g.value}
                  className={gender === g.value ? 'active' : ''}
                  onClick={() => setGender(g.value)}
                  disabled={saving}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="error small">{error}</p>}
        </div>

        <div className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>Отмена</button>
          <button type="button" className="btn" onClick={save} disabled={saving || !changed || Boolean(localError) || Boolean(cropping)}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
