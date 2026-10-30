// После сборки для GitHub Pages: по копии index.html в папку каждой известной страницы.
//
// GitHub Pages умеет только отдавать файлы. Адрес /frontend/rating/ он отдаёт
// из rating/index.html со статусом 200; если такого файла нет — 404.html со
// статусом 404 (страница откроется, но с ошибкой в консоли). Поэтому кладём копии
// для всех страниц, адреса которых известны заранее, а 404.html оставляем для
// остальных (например, результат пробника /exam/12).
//
// Слэш на конце адреса дописывает сам сайт (components/Layout.jsx).

import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'

// Номера ЕГЭ — те же коды, что в справочнике backend (app/seed.py).
const NUMBER_CODES = [
  ...Array.from({ length: 18 }, (_, i) => String(i + 1)),
  '19-21',
  ...Array.from({ length: 6 }, (_, i) => String(i + 22)),
]

const ROUTES = ['tasks', 'login', 'profile', 'exam', 'rating', 'admin', ...NUMBER_CODES.map((c) => `tasks/${c}`)]

copyFileSync(join(DIST, 'index.html'), join(DIST, '404.html'))
for (const route of ROUTES) {
  mkdirSync(join(DIST, route), { recursive: true })
  copyFileSync(join(DIST, 'index.html'), join(DIST, route, 'index.html'))
}
console.log(`GitHub Pages: 404.html и ${ROUTES.length} копий index.html для известных страниц`)
