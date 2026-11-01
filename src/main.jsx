import { QueryClientProvider } from '@tanstack/react-query'
import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth.jsx'
import Layout from './components/Layout.jsx'
import ExamPage from './pages/ExamPage.jsx'
import ExamResultPage from './pages/ExamResultPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NumbersPage from './pages/NumbersPage.jsx'
import NumberTasksPage from './pages/NumberTasksPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RatingPage from './pages/RatingPage.jsx'
import { queryClient } from './queryClient.js'
import './styles.css'

// Редактор задач (с панелью Markdown и загрузкой файлов) нужен только админу —
// грузится отдельным файлом при открытии страницы, а не со всем сайтом.
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))

// Адреса страниц сайта:
//   /               — главная: приветствие, счётчик до ЕГЭ, анимация; гостю — о сайте и вход
//   /tasks          — сетка номеров ЕГЭ
//   /tasks/17       — прототипы номера 17
//   /login          — вход через Telegram
//   /profile        — профиль (только для вошедших)
//   /exam           — пробник (старт или идущий), /exam/12 — результат
//   /rating         — рейтинг
//   /admin          — админка: задачи, ученики (?tab=users), журнал (?tab=log); только админ
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      {/* На GitHub Pages сайт живёт не в корне, а в /frontend/ — роутеру нужен этот префикс. */}
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'}>
        <Routes>
          <Route element={<Layout />}>
            {/* «Задания» — прямо на главной: по адресу сайта GitHub Pages отдаёт настоящий
                index.html со статусом 200, и F5 на главной не даёт 404. */}
            <Route index element={<HomePage />} />
            <Route path="/tasks" element={<NumbersPage />} />
            <Route path="/tasks/:code" element={<NumberTasksPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/exam" element={<ExamPage />} />
            <Route path="/exam/:id" element={<ExamResultPage />} />
            <Route path="/rating" element={<RatingPage />} />
            <Route path="/admin" element={<Suspense fallback={<p className="muted">Загрузка…</p>}><AdminPage /></Suspense>} />
            <Route path="*" element={<PlaceholderPage title="Страница не найдена" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
