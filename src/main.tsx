import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { ApiConfigProvider } from './context/ApiConfigContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ApiConfigProvider>
        <App />
      </ApiConfigProvider>
    </HelmetProvider>
  </StrictMode>,
);
