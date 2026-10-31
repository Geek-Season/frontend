// Поле для текста задачи в Markdown: панель кнопок, горячие клавиши, предпросмотр,
// вставка картинок прямо в текст (в том числе скриншотов из буфера обмена).
//
// Картинки, ещё не загруженные на сервер, вставляются как ![](pending:<ключ>):
// после «Сохранить» редактор задач (pages/AdminPage.jsx) загрузит файл и заменит
// заглушку на настоящий адрес /files/….

import { useRef, useState } from 'react'

import Markdown from './Markdown.jsx'

const TOOLS = [
  { title: 'Жирный (Ctrl+B)', label: <b>Ж</b>, wrap: ['**', '**'], key: 'b' },
  { title: 'Курсив (Ctrl+I)', label: <i>К</i>, wrap: ['*', '*'], key: 'i' },
  { title: 'Подчёркнутый (Ctrl+U)', label: <u>Ч</u>, wrap: ['<u>', '</u>'], key: 'u' },
  { title: 'Зачёркнутый', label: <s>З</s>, wrap: ['~~', '~~'] },
  { title: 'Нижний индекс: 1111011₂', label: <>x<sub>2</sub></>, wrap: ['<sub>', '</sub>'], placeholder: '2' },
  { title: 'Степень: 2¹⁰', label: <>x<sup>2</sup></>, wrap: ['<sup>', '</sup>'], placeholder: '10' },
  { title: 'Выделение маркером', label: <mark>М</mark>, wrap: ['<mark>', '</mark>'] },
  { title: 'Формула (LaTeX): $27x98876_{22}$', label: 'ƒ(x)', wrap: ['$', '$'], placeholder: 'x_{2}' },
  { title: 'Ссылка (Ctrl+K)', label: '🔗', key: 'k', link: true },
  { title: 'Код в строке', label: <code>{'<>'}</code>, wrap: ['`', '`'], placeholder: 'код' },
  { title: 'Блок кода (программа)', label: <code>{'{ }'}</code>, block: '```python\n', blockEnd: '\n```', placeholder: 'print(42)' },
  { title: 'Список', label: '•', linePrefix: '- ' },
  { title: 'Нумерованный список', label: '1.', linePrefix: '1. ' },
  { title: 'Таблица', label: '▦', insert: '\n| | 1 | 2 | 3 |\n|---|---|---|---|\n| 1 | | | |\n| 2 | | | |\n' },
]

/**
 * images — что можно вставить: [{ src, name, preview? }] (src — /files/… или pending:…);
 * onAddImages(files) — добавить новые картинки к задаче, возвращает их src для вставки;
 * resolveImage(src) — адрес для предпросмотра ещё не загруженной картинки.
 */
export default function MarkdownEditor({
  label, value, onChange, required = false, rows = 6, images = [], onAddImages, resolveImage, disabled,
}) {
  const area = useRef(null)
  const fileInput = useRef(null)
  const [menu, setMenu] = useState(false)
  const [help, setHelp] = useState(false)

  // Заменить выделение и поставить курсор/выделение внутри вставленного.
  function replaceSelection(before, middle, after) {
    const el = area.current
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = value.slice(0, start) + before + middle + after + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + middle.length)
    })
  }

  function apply(tool) {
    const el = area.current
    const selected = value.slice(el.selectionStart, el.selectionEnd)
    if (tool.link) {
      // Выделен адрес — он станет ссылкой, остаётся вписать текст. Иначе выделенный текст
      // станет текстом ссылки, а курсор встанет на место адреса.
      if (/^https?:\/\/\S+$/.test(selected.trim())) return replaceSelection('[', 'текст ссылки', `](${selected.trim()})`)
      return replaceSelection(`[${selected || 'ссылка'}](`, 'https://', ')')
    }
    if (tool.wrap) return replaceSelection(tool.wrap[0], selected || tool.placeholder || 'текст', tool.wrap[1])
    if (tool.block) return replaceSelection(tool.block, selected || tool.placeholder, tool.blockEnd)
    if (tool.insert) return replaceSelection('', '', tool.insert)
    if (tool.linePrefix) {
      const lines = (selected || 'пункт').split('\n')
      const text = lines.map((line, i) => (tool.linePrefix === '1. ' ? `${i + 1}. ` : tool.linePrefix) + line).join('\n')
      return replaceSelection('', text, '')
    }
  }

  function insertImages(srcs) {
    if (!srcs?.length) return
    // Картинка — отдельным абзацем: пустая строка до и после.
    const el = area.current
    const before = value.slice(0, el.selectionStart)
    const lead = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
    replaceSelection(lead, srcs.map((src) => `![](${src})`).join('\n\n'), '\n\n')
    setMenu(false)
  }

  function handleKeyDown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return
    const tool = TOOLS.find((t) => t.key === event.key.toLowerCase())
    if (tool) {
      event.preventDefault()
      apply(tool)
    }
  }

  // Скриншот из буфера или картинка, перетащенная в поле, — сразу в текст.
  function takeImageFiles(fileList, event) {
    const files = [...(fileList ?? [])].filter((f) => f.type.startsWith('image/'))
    if (!files.length || !onAddImages) return false
    event.preventDefault()
    event.stopPropagation() // форма не должна добавить ту же картинку второй раз
    insertImages(onAddImages(files))
    return true
  }

  return (
    <div className="mde">
      <div className="mde__head">
        <span className="mde__label">{label}{required && ' *'}</span>
        <button type="button" className="mde__help-toggle" onClick={() => setHelp((h) => !h)}>
          {help ? 'Скрыть подсказку' : 'Как оформлять?'}
        </button>
      </div>

      {help && <Cheatsheet />}

      <div className="mde__toolbar" role="toolbar" aria-label={`Оформление: ${label}`}>
        {TOOLS.map((tool) => (
          <button
            key={tool.title}
            type="button"
            className="mde__tool"
            title={tool.title}
            aria-label={tool.title}
            onMouseDown={(e) => e.preventDefault()} // не терять выделение в поле
            onClick={() => apply(tool)}
            disabled={disabled}
          >
            {tool.label}
          </button>
        ))}
        {onAddImages && (
          <span className="mde__image-menu">
            <button
              type="button"
              className="mde__tool"
              title="Вставить картинку в текст"
              aria-label="Вставить картинку в текст"
              aria-expanded={menu}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setMenu((m) => !m)}
              disabled={disabled}
            >
              🖼
            </button>
            {menu && (
              <div className="mde__menu" role="menu">
                {images.map((image) => (
                  <button key={image.src} type="button" role="menuitem" className="mde__menu-item"
                    onMouseDown={(e) => e.preventDefault()} onClick={() => insertImages([image.src])}>
                    <img src={image.preview} alt="" />
                    <span>{image.name}</span>
                  </button>
                ))}
                <button type="button" role="menuitem" className="mde__menu-item mde__menu-item--upload"
                  onMouseDown={(e) => e.preventDefault()} onClick={() => fileInput.current?.click()}>
                  + Загрузить новую…
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  multiple
                  hidden
                  onChange={(e) => {
                    insertImages(onAddImages([...e.target.files]))
                    e.target.value = ''
                  }}
                />
              </div>
            )}
          </span>
        )}
      </div>

      <div className="mde__body">
        <textarea
          ref={area}
          className="mde__input"
          rows={rows}
          required={required}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={(e) => takeImageFiles(e.clipboardData?.files, e)}
          onDrop={(e) => takeImageFiles(e.dataTransfer?.files, e)}
          disabled={disabled}
        />
        <div className="mde__preview" aria-label="Предпросмотр">
          {value.trim()
            ? <Markdown text={value} resolveImage={resolveImage} />
            : <span className="muted small">Здесь появится то, что увидит ученик</span>}
        </div>
      </div>
    </div>
  )
}

function Cheatsheet() {
  const rows = [
    ['**жирный**', 'жирный'],
    ['*курсив*', 'курсив'],
    ['<u>подчёркнутый</u>', 'подчёркнутый'],
    ['1111011<sub>2</sub> = 123<sub>10</sub>', 'индексы'],
    ['2<sup>10</sup>', 'степень'],
    ['$27x98876_{22} + 26x51_{22}$', 'формула (LaTeX)'],
    ['$$\\sum_{i=1}^{n} i$$', 'формула отдельной строкой'],
    ['- пункт', 'список'],
    ['| a | b |\\n|---|---|\\n| 1 | 2 |', 'таблица'],
    ['[учебник](https://kpolyakov.spb.ru)', 'ссылка — кнопка 🔗 или Ctrl+K; адрес https://… и сам станет ссылкой'],
    ['`код`, ```блок кода```', 'код'],
    ['![](/files/….png)', 'картинка в этом месте текста — кнопка 🖼 или Ctrl+V'],
  ]
  return (
    <table className="mde__cheatsheet">
      <tbody>
        {rows.map(([code, what]) => (
          <tr key={code}><td><code>{code}</code></td><td>{what}</td></tr>
        ))}
        <tr><td colSpan={2} className="muted">Одиночный перенос строки — новая строка; пустая строка — новый абзац.</td></tr>
      </tbody>
    </table>
  )
}

// ---------- Заглушки ещё не загруженных картинок ----------

/**
 * Заменить в тексте адреса картинок: replacements — { 'pending:…' | '/files/…': новый адрес или null }.
 * null — картинку убрать из текста целиком (файл не загрузился или удалён).
 */
export function replaceImageSources(text, replacements) {
  if (!text) return text
  return text
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (whole, alt, src) => {
      if (!(src in replacements)) return whole
      return replacements[src] === null ? '' : `![${alt}](${replacements[src]})`
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
