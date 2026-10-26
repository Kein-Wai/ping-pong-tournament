import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

// La regla no-restricted-syntax de eslint.config.mjs fija el contrato de respuesta único.
// Aquí se ejecuta ESLint de verdad sobre código de ejemplo. Los tests de la API se lanzan
// siempre desde api/ (no hay package.json en la raíz del monorepo).
const eslint = new ESLint();

const lintRule = async (code: string, filePath: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === 'no-restricted-syntax');
};

const handler = (body: string) =>
  `import type { Response } from 'express';\nexport const h = (res: Response) => ${body};\n`;

describe('regla de contrato de respuesta (no-restricted-syntax)', () => {
  it.each([
    ['res.json(...)', 'res.json({ ok: true })'],
    ['res.status(n).json(...)', 'res.status(404).json({ error: "x" })'],
  ])('falla en una ruta que usa %s', async (_name, body) => {
    const messages = await lintRule(handler(body), 'src/routes/ejemplo.ts');

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
    expect(messages[0].message).toContain('sendData');
  });

  it('permite los helpers del contrato', async () => {
    const messages = await lintRule(
      `import { sendData } from '../http/response';\nimport type { Response } from 'express';\nexport const h = (res: Response) => sendData(res, 1);\n`,
      'src/routes/ejemplo.ts',
    );

    expect(messages).toHaveLength(0);
  });

  it('no afecta a express.json() del arranque', async () => {
    const messages = await lintRule(
      `import express from 'express';\nexport const app = express();\napp.use(express.json());\n`,
      'src/index.ts',
    );

    expect(messages).toHaveLength(0);
  });

  it.each(['src/http/response.ts', 'src/routes/ejemplo.test.ts', 'src/testing/auth.ts'])(
    'no se aplica a %s',
    async (file) => {
      const messages = await lintRule(handler('res.status(200).json({ ok: true })'), file);

      expect(messages).toHaveLength(0);
    },
  );
});
