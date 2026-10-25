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
  // 3. El acceso a datos pasa por api/services (o por el adaptador http de api/client):
  //    pantallas, hooks y componentes no deben importar api/axios directamente. Los tests
  //    y api/client.ts quedan exentos porque mockean o envuelven esa frontera; main.tsx
  //    también, porque registra en el interceptor el cierre de sesión (setUnauthorizedHandler).
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/api/client.ts', 'src/main.tsx', 'src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/api/axios'],
              message:
                'No importes api/axios: usa los servicios de api/services (o el adaptador http de api/client).',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
