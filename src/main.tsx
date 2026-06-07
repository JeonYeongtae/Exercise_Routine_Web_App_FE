import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { ensureSeeded } from './db/db.ts'

// 최초 실행 시 초기 운동 진행 상태를 심는다
void ensureSeeded()

// 서비스 워커 등록 (오프라인 + 설치형 PWA)
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
