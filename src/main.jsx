import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Layout from './components/Layout.jsx'
import NumbersPage from './pages/NumbersPage.jsx'
import NumberTasksPage from './pages/NumberTasksPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import './styles.css'

// Адреса страниц сайта:
//   /tasks          — сетка номеров ЕГЭ
//   /tasks/17       — прототипы номера 17
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/tasks" replace />} />
          <Route path="/tasks" element={<NumbersPage />} />
          <Route path="/tasks/:code" element={<NumberTasksPage />} />
          <Route path="/profile" element={<PlaceholderPage title="Профиль" />} />
          <Route path="*" element={<PlaceholderPage title="Страница не найдена" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
