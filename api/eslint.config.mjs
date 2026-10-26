import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      // Sin console.log suelto: console.info para eventos operativos y console.error en los catch.
      // Quitar un campo con rest-destructuring (`const { password, ...rest } = x`) no es una variable sin usar.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }]
    }
  },
  {
    // Los tests simulan Prisma y Express con dobles parciales: ahí `as any` es el idioma, no una deuda.
    files: ['src/**/*.test.ts', 'src/testing/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off'
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