// Условие, вопрос или разбор задачи в Markdown — так, как его видит ученик.
//
// Что умеет (шпаргалка для автора — в редакторе, components/MarkdownEditor.jsx):
//   **жирный**, *курсив*, ~~зачёркнутый~~, <u>подчёркнутый</u>, <mark>выделение</mark>
//   1111011<sub>2</sub> = 123<sub>10</sub>, 2<sup>10</sup>      — индексы и степени
//   $27x98876_{22} + 26x51_{22}$, $$\sum_{i=1}^{n} i$$           — формулы (KaTeX)
//   таблицы | a | b |, списки, `код`, ```блоки кода```
//   ![подпись](/files/….png)                                     — картинка в любом месте текста
//   одиночный перенос строки — новая строка (как в старых задачах из простого текста)
//
// Безопасность: сырой HTML не исполняется. Теги <u>, <sub>, <sup>, <mark>, <s>, <br>
// распознаёт свой плагин (markdownTags.js), любой другой HTML показывается как текст.
// Ссылки и картинки — только http(s) и адреса сайта (javascript: и т. п. вырезаются).

import { useEffect, useState } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { fileUrl } from '../api.js'
import remarkTaskTags from './markdownTags.js'

// KaTeX (~75 КБ и шрифты) грузится, только когда в тексте есть формулы.
let katexPlugin = null
let katexLoading = null
function loadKatex() {
  katexLoading ??= Promise.all([import('rehype-katex'), import('katex/dist/katex.min.css')]).then(([module]) => {
    katexPlugin = module.default
  })
  return katexLoading
}

const hasMath = (text) => /\$[^$\n]+\$|\$\$/.test(text)

function urlTransform(url, key) {
  // blob: — картинки, ещё не загруженные на сервер (предпросмотр в редакторе)
  if (key === 'src' && url.startsWith('blob:')) return url
  return defaultUrlTransform(url)
}

/**
 * text — Markdown; resolveImage(src) — подменить адрес картинки (редактор: ещё не загруженные файлы).
 */
export default function Markdown({ text, className = '', resolveImage }) {
  const [, rerender] = useState(0)
  const needsMath = hasMath(text ?? '')
  useEffect(() => {
    if (needsMath && !katexPlugin) loadKatex().then(() => rerender((n) => n + 1))
  }, [needsMath])

  if (!text) return null
  const source = resolveImage ? text.replace(/\]\((pending:[^)\s]+)\)/g, (m, src) => `](${resolveImage(src) ?? src})`) : text

  return (
    <div className={`md ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath, remarkTaskTags]}
        rehypePlugins={katexPlugin ? [[katexPlugin, { throwOnError: false, strict: false }]] : []}
        urlTransform={urlTransform}
        components={{ img: MarkdownImage, a: MarkdownLink, table: MarkdownTable }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}

/** Картинка из текста: /files/… — с API (сайт и API на разных адресах); нажатие — оригинал. */
function MarkdownImage({ src = '', alt = '', node: _node, ...rest }) {
  const url = src.startsWith('/files/') ? fileUrl({ url: src }) : src
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noreferrer" className="md__image-link">
      <img {...rest} src={url} alt={alt || 'Иллюстрация к задаче'} className="md__image" loading="lazy" />
    </a>
  )
}

function MarkdownLink({ node: _node, ...props }) {
  return <a {...props} target="_blank" rel="noreferrer nofollow" />
}

/** Широкая таблица прокручивается сама, а не растягивает страницу на телефоне. */
function MarkdownTable({ node: _node, ...props }) {
  return (
    <div className="md__table-wrap">
      <table {...props} />
    </div>
  )
}

// ---------- Помощники ----------

/** Адреса /files/…, вставленные в текст: такие картинки не показываем ещё раз под условием. */
export function imagesInText(...texts) {
  const found = new Set()
  for (const text of texts) {
    for (const match of (text ?? '').matchAll(/\]\((\/files\/[^)\s]+)\)/g)) found.add(match[1])
  }
  return found
}

/** Текст без разметки — для коротких строк (список задач в редакторе). */
export function plainText(text = '') {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '🖼')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\$\$?([^$]*)\$\$?/g, '$1')
    .replace(/[*_~`#>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
