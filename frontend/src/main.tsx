import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/hooks/useAuth'
import { getApiBase } from '@/lib/constants'
import App from './App'
import './index.css'

// Register minimal pass-through Service Worker so Chrome enables WebAPK / App Installation (Online-Only)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = getApiBase();
    const swUrl = `${base}/sw.js`;
    const scope = `${base}/`;
    navigator.serviceWorker.register(swUrl, { scope }).catch(() => {
      // Ignore registration errors in unsupported environments
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <App />
        <Toaster position="bottom-right" />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
