import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import DiagnosticPage from './pages/DiagnosticPage.tsx'
import ReportPage from './pages/ReportPage.tsx'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/diagnostico', element: <DiagnosticPage /> },
  { path: '/relatorio', element: <ReportPage /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
