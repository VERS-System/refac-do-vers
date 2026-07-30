// Configuração de CORS
//
// Define origens, métodos e headers permitidos para as requisições
// cross-origin dos frontends (web, dashboard, mobile).

import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const corsConfig: CorsOptions = {
  origin: [
    'http://localhost:3001', // web
    'http://localhost:3050', // dashboard (Vite)
    'http://localhost:5173', // web (Vite direto)
    'http://localhost:5174', // dashboard (Vite direto)
    'http://localhost:8081', // mobile (Expo dev)
    'http://localhost:8080', // mobile (Docker)
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};
