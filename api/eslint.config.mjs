import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      'no-console': 'warn'
    }
  },
  {
    // Contrato de respuesta único: las rutas responden con sendData / sendMessage / sendError
    // (http/response.ts), nunca armando el JSON a mano.
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts', 'src/testing/**', 'src/http/response.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='json'][callee.object.name='res']",
          message: 'Responde con sendData, sendMessage o sendError (http/response) en lugar de res.json.',
        },
        {
          selector:
            "CallExpression[callee.property.name='json'][callee.object.callee.property.name='status']",
          message:
            'Responde con sendData, sendMessage o sendError (http/response) en lugar de res.status().json.',
        },
      ],
    },
  }
);