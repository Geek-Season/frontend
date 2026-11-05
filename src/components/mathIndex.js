// Плагин для remark: в формулах $…$ и $$…$$ многозначный индекс можно писать без скобок.
//
// В LaTeX x_10 — это x с индексом 1 и следом обычная 0: без скобок индекс берёт один символ.
// Автору задач проще писать как в тетради, поэтому число целиком после «_» само становится
// индексом:  1011_10 → 1011_{10},  27x98876_22 → 27x98876_{22},  a_123 → a_{123}.
// Уже со скобками (x_{22}) и экранированное \_ не трогаем. Текст вне формул и код — тоже.

const LONG_INDEX = /(^|[^\\])_(\d{2,})/g // без lookbehind — старые Safari его не знают

export function expandIndexes(tex) {
  return tex.replace(LONG_INDEX, '$1_{$2}')
}

function walk(node) {
  if (node.type === 'inlineMath' || node.type === 'math') {
    node.value = expandIndexes(node.value)
    // remark-math кладёт текст формулы ещё и сюда — его и читает rehype-katex
    for (const child of node.data?.hChildren ?? []) {
      if (child.type === 'text') child.value = expandIndexes(child.value)
    }
    return
  }
  node.children?.forEach(walk)
}

export default function remarkMathIndex() {
  return walk
}
