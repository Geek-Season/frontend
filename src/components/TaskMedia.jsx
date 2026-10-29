import { fileUrl } from '../api.js'

// Картинки и файлы к задаче — под условием.
// Картинки показываются сразу (нажатие открывает оригинал в новой вкладке),
// файлы к заданию — списком ссылок для скачивания, как на ЕГЭ.
export default function TaskMedia({ task }) {
  const images = task.images ?? []
  const attachments = task.attachments ?? []
  if (!task.image_url && images.length === 0 && attachments.length === 0) return null

  return (
    <div className="task-media">
      {task.image_url && <img className="task__image" src={task.image_url} alt="Иллюстрация к задаче" />}
      {images.map((image, i) => (
        <a key={image.id} href={fileUrl(image)} target="_blank" rel="noreferrer" className="task-media__image">
          <img
            className="task__image"
            src={fileUrl(image)}
            alt={images.length > 1 ? `Иллюстрация ${i + 1} к задаче` : 'Иллюстрация к задаче'}
            loading="lazy"
          />
        </a>
      ))}
      {attachments.length > 0 && (
        <ul className="attachments" aria-label="Файлы к заданию">
          {attachments.map((file) => (
            <li key={file.id}>
              <a href={fileUrl(file)} download={file.name} className="attachment">
                <span className="attachment__icon" aria-hidden="true">{fileIcon(file.name)}</span>
                <span className="attachment__name">{file.name}</span>
                <span className="attachment__size">{formatSize(file.size)}</span>
                <span className="attachment__action">Скачать</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`
}

export function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()
  if (['xlsx', 'xls', 'ods', 'csv'].includes(ext)) return '📊'
  if (['docx', 'doc', 'odt', 'pdf'].includes(ext)) return '📄'
  if (ext === 'zip') return '🗜'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return '🖼'
  return '📝'
}
