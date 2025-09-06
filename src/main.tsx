import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ProApp from './ProApp'

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <StrictMode>
      <ProApp />
    </StrictMode>,
  )
}
