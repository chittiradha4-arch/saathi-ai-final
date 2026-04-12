import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

try {
  console.log("App starting...");
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Root element not found");
    document.body.innerHTML = '<div style="color:red;padding:20px;"><h1>Error</h1><p>Root element not found</p></div>';
  } else {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
    console.log("App render initiated");
  }
} catch (e) {
  console.error("Startup error:", e);
  document.body.innerHTML = '<div style="color:red;padding:20px;"><h1>Startup Error</h1><pre>' + e + '</pre></div>';
}
