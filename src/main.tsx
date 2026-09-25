import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ApiSyncProvider } from './context/ApiSyncContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiSyncProvider>
      <App />
    </ApiSyncProvider>
  </StrictMode>,
);
