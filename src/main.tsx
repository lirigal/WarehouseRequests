import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and ignore benign Vite WebSocket/HMR unhandled rejections or closed-connection events
if (typeof window !== 'undefined') {
  const isWebsocketOrViteError = (msg: string) => {
    const low = msg.toLowerCase();
    return (
      low.includes('websocket') ||
      low.includes('vite') ||
      low.includes('hmr') ||
      low.includes('failed to connect') ||
      low.includes('connection closed') ||
      low.includes('net::err_connection') ||
      low.includes('showpicker') ||
      low.includes('cross-origin')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason || '');
    const reasonMsg = event.reason?.message || '';
    if (isWebsocketOrViteError(reasonStr) || isWebsocketOrViteError(reasonMsg)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || '';
    const errorStr = event.error ? String(event.error) : '';
    if (isWebsocketOrViteError(errorMsg) || isWebsocketOrViteError(errorStr)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
