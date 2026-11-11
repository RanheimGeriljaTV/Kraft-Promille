import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fontene pakkes inn i bygget, så siden ikke henter noe fra Google eller andre tjenester.
import '@fontsource/syne/700.css';
import '@fontsource/syne/800.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import './index.css';
import App from './App.jsx';

const root = document.getElementById('root');
if (!root) throw new Error('Fant ikke #root i index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
