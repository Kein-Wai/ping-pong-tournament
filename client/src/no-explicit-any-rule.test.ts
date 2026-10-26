import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

// Tras la Fase 5 el cliente no tiene ningún `any` explícito: la regla de eslint.config.js
// pasa de aviso a error para que no vuelva a colarse. Aquí se ejecuta ESLint de verdad
// sobre código de ejemplo (los tests del cliente se lanzan siempre desde client/).
const eslint = new ESLint();

const RULE = '@typescript-eslint/no-explicit-any';

const lintRule = async (code: string, filePath: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === RULE);
};

describe('regla no-explicit-any', () => {
  it('falla (error) cuando una pantalla declara un any', async () => {
    const messages = await lintRule('export const x: any = 1;\n', 'src/pages/Ejemplo.tsx');

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
  });

  it('falla también en hooks y componentes', async () => {
    const hook = await lintRule('export const f = (a: any[]) => a;\n', 'src/hooks/useEjemplo.ts');
    const component = await lintRule(
      'export const f = (a: unknown) => a as any;\n',
      'src/components/common/Ejemplo.tsx',
    );

    expect(hook).toHaveLength(1);
    expect(component).toHaveLength(1);
  });

  it('no avisa con unknown ni con tipos concretos', async () => {
    const messages = await lintRule(
      'export const x: unknown = 1;\nexport const y: string[] = [];\n',
      'src/pages/Ejemplo.tsx',
    );

    expect(messages).toHaveLength(0);
  });
});
