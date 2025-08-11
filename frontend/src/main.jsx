import 'pdfjs-dist/web/pdf_viewer.css';
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './pages/App'
import './styles.css'
import './i18n/setup'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
