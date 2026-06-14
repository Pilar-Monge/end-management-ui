import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './shared/context/AuthContext'
import './index.css'
import App from './App.tsx'

const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (
    args.length > 0 &&
    typeof args[0] === 'string' &&
    (args[0].includes('THREE.Clock') || args[0].includes('THREE.Timer') || (args[0].includes('deprecated') && args[0].includes('THREE')))
  ) {
    return;
  }
  originalWarn(...args);
};

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
