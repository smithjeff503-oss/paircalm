import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { tracking } from './lib/tracking';

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (measurementId) {
  tracking.init(measurementId);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
