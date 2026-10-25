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

      // El cliente ya no tiene ningún "any" explícito: se mantiene como error para que no vuelva
      '@typescript-eslint/no-explicit-any': 'error',

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
      // Las rutas de navegación salen de APP_ROUTES (constants/routes.ts), no de un path escrito a mano.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='navigate'] > Literal.arguments:first-child[value=/^\\//]",
          message: 'No escribas la ruta a mano: usa APP_ROUTES (constants/routes.ts).',
        },
        {
          selector:
            "CallExpression[callee.name='navigate'] > TemplateLiteral.arguments:first-child[quasis.0.value.raw=/^\\//]",
          message: 'No escribas la ruta a mano: usa APP_ROUTES (constants/routes.ts).',
        },
        {
          selector:
            "JSXOpeningElement[name.name='Navigate'] > JSXAttribute[name.name='to'] > Literal[value=/^\\//]",
          message: 'No escribas la ruta a mano: usa APP_ROUTES (constants/routes.ts).',
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
