import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import GameAnimationsApp from './GameAnimationsApp'

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <GameAnimationsApp />
    </StrictMode>,
  )
}
