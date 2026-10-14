/**
 * Ponto de entrada da interface React do app desktop.
 *
 * Carrega os estilos globais (tokens do DESIGN.md e fontes locais) e monta o
 * componente raiz no elemento #root do index.html.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
