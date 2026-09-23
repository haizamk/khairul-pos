import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { FirebaseSyncProvider } from './context/FirebaseSyncContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirebaseSyncProvider>
      <App />
    </FirebaseSyncProvider>
  </StrictMode>,
);
