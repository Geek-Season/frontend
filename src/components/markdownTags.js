// Плагин для remark: несколько HTML-тегов внутри Markdown — без HTML-парсера.
//
// Markdown не умеет подчёркивание и индексы, поэтому в тексте задачи разрешены теги
//   <u>…</u>  <sub>…</sub>  <sup>…</sup>  <mark>…</mark>  <s>…</s>  <br>
// — только они и только без атрибутов. Любой другой HTML (<script>, <img onerror=…>,
// <div style=…>) показывается как обычный текст: на странице он ничего не делает.
//
// Почему не rehype-raw: тот тянет полноценный HTML-парсер (+53 КБ к сайту) ради
// пяти безобидных тегов.

const PAIRED = new Set(['u', 'sub', 'sup', 'mark', 's'])

function openTag(value) {
  const match = /^<([a-z]+)>$/i.exec(value.trim())
  return match && PAIRED.has(match[1].toLowerCase()) ? match[1].toLowerCase() : null
}

const isClose = (value, tag) => new RegExp(`^</${tag}>$`, 'i').test(value.trim())
const isBreak = (value) => /^<br\s*\/?>$/i.test(value.trim())

function transform(node) {
  if (!Array.isArray(node.children)) return
  const out = []
  const children = node.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (child.type === 'html') {
      if (isBreak(child.value)) {
        out.push({ type: 'break' })
        continue
      }
      const tag = openTag(child.value)
      if (tag) {
        const end = children.findIndex((c, j) => j > i && c.type === 'html' && isClose(c.value, tag))
        if (end !== -1) {
          const inner = { type: 'paragraph', children: children.slice(i + 1, end) }
          transform(inner) // вложенные теги: <u><sub>2</sub></u>
          out.push({ type: 'taskTag', data: { hName: tag }, children: inner.children })
          i = end
          continue
        }
      }
      // Остальной HTML — просто текст.
      out.push({ type: 'text', value: child.value })
      continue
    }
    transform(child)
    out.push(child)
  }
  node.children = out
}

export default function remarkTaskTags() {
  return (tree) => transform(tree)
}
