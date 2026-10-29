# Geek Season — frontend

Клиентская часть платформы подготовки к ЕГЭ по информатике. Работает с API
[backend](https://github.com/Geek-Season/backend).

**Стек:** React 18, Vite 6, React Router 6, qrcode.react.

## Страницы

| Адрес | Страница |
|---|---|
| `/tasks` | Сетка номеров ЕГЭ с поиском и прогрессом |
| `/tasks/:code` | Задачи номера: фильтры по источнику и прогрессу, сортировка, проверка ответа; для 19–21 — три поля ответа |
| `/login` | Вход через Telegram: QR-код или код из бота |
| `/profile` | Статистика ученика: решено, точность, серия, активность за 14 дней, слабые номера, достижения |
| `/exam` | Пробник: таймер, автосохранение ответов, навигация по позициям |
| `/exam/:id` | Результат: первичный и тестовый балл, разбор |
| `/rating` | Рейтинг за неделю и за всё время |
| `/admin` | Редактор банка задач (роль admin): условие, ответ, картинки и файлы к заданию |

## Запуск

Требуется Node.js 20+ и запущенный backend на `http://127.0.0.1:8000`.

```bash
npm install
npm run dev       # http://127.0.0.1:5173
npm run build     # сборка в dist/
```

Запросы к `/api/*` проксируются на backend (`vite.config.js`); адрес backend задаётся переменной `BACKEND_URL`.

## Деплой на GitHub Pages

Сайт собирается и выкладывается сам при каждом изменении `main` (`.github/workflows/deploy.yml`)
и открывается по адресу <https://geek-season.github.io/frontend/>.

Один раз настроить в репозитории на GitHub:

1. **Settings → Pages → Build and deployment → Source:** GitHub Actions.
2. **Settings → Secrets and variables → Actions → Variables → New repository variable:**
   `API_URL` = адрес backend на Netrun, например `https://neyman-inf.netrun.io` (без `/` в конце).
3. На backend в секретах Netrun: `CORS_ORIGINS=https://geek-season.github.io` — иначе браузер
   не пустит сайт к API.
4. **Actions → Deploy to GitHub Pages → Run workflow** (или любой push в `main`).

Поменялся адрес API — измени `API_URL` и снова нажми **Run workflow**.

| Переменная сборки | Что задаёт |
|---|---|
| `VITE_API_URL` | Адрес API. Не задан — `/api` (прокси Vite при разработке) |
| `VITE_BASE` | Путь сайта. На Pages — `/frontend/`, локально — `/` |

Проверить сборку как на Pages: `VITE_API_URL=http://127.0.0.1:8000 VITE_BASE=/frontend/ npm run build:pages`.
Внутренние страницы (например, `/frontend/tasks/17`) открываются по прямой ссылке через `404.html` —
копию `index.html`, которую GitHub Pages отдаёт для неизвестных путей.

## Структура

```
src/
├── main.jsx            маршруты
├── api.js              все запросы к backend
├── auth.jsx            контекст авторизации, токен в localStorage
├── styles.css          стили и цветовые переменные
├── components/         Layout, TaskCard, TaskMedia (картинки и файлы), ActivityChart
└── pages/              страницы приложения
```
