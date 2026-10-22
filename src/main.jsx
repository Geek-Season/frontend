import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth.jsx'
import Layout from './components/Layout.jsx'
import AdminPage from './pages/AdminPage.jsx'
import ExamPage from './pages/ExamPage.jsx'
import ExamResultPage from './pages/ExamResultPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NumbersPage from './pages/NumbersPage.jsx'
import NumberTasksPage from './pages/NumberTasksPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RatingPage from './pages/RatingPage.jsx'
import './styles.css'

// Адреса страниц сайта:
//   /tasks          — сетка номеров ЕГЭ
//   /tasks/17       — прототипы номера 17
//   /login          — вход через Telegram
//   /profile        — профиль (только для вошедших)
//   /exam           — пробник (старт или идущий), /exam/12 — результат
//   /rating         — рейтинг
//   /admin          — редактор задач (только админ)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/tasks" replace />} />
            <Route path="/tasks" element={<NumbersPage />} />
            <Route path="/tasks/:code" element={<NumberTasksPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/exam" element={<ExamPage />} />
            <Route path="/exam/:id" element={<ExamResultPage />} />
            <Route path="/rating" element={<RatingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<PlaceholderPage title="Страница не найдена" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)
