// Tailwind CSS v4 — arquivo de configuração
//
// Tailwind v4 é configurável via CSS, mas mantemos este arquivo
// para compatibilidade com ferramentas que ainda o exigem.
// As cores do tema VERS são definidas inline ou via @theme no CSS.

import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
} satisfies Config;
