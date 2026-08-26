import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

import eslintConfigPrettier from 'eslint-config-prettier';

export default defineConfig([
  // 1. Añadimos las carpetas de Android, iOS y build para que ESLint no las toque
  globalIgnores(['dist', 'android/**', 'ios/**', 'build/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    // 2. Añadimos las reglas personalizadas aquí
    rules: {
      // Apagamos la regla estricta que te daba error en los useEffects
      'react-hooks/set-state-in-effect': 'off',

      // Convertimos el error de usar "any" en una simple advertencia (naranja en vez de rojo)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Convertimos las dependencias faltantes del useEffect en advertencia
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  eslintConfigPrettier,
]);
