import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

// Las rutas de navegación salen de APP_ROUTES (constants/routes.ts); eslint.config.js
// prohíbe escribir un path a mano en navigate() o en <Navigate to>. Aquí se ejecuta
// ESLint de verdad sobre código de ejemplo (los tests se lanzan siempre desde client/).
const eslint = new ESLint();

const RULE = 'no-restricted-syntax';

const lintRule = async (code: string, filePath = 'src/pages/Ejemplo.tsx') => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === RULE);
};

describe('regla de rutas escritas a mano', () => {
  it('falla (error) con navigate y un literal de ruta', async () => {
    const messages = await lintRule(
      "export const f = (navigate: (p: string) => void) => navigate('/torneos');\n",
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
    expect(messages[0].message).toContain('APP_ROUTES');
  });

  it('falla con navigate y una plantilla que empieza por /', async () => {
    const messages = await lintRule(
      'export const f = (navigate: (p: string) => void, id: string) => navigate(`/jugadores/${id}`);\n',
    );

    expect(messages).toHaveLength(1);
  });

  it('falla con <Navigate to="/..."> en JSX', async () => {
    const messages = await lintRule(
      'import { Navigate } from \'react-router-dom\';\nexport const X = () => <Navigate to="/login" replace />;\n',
    );

    expect(messages).toHaveLength(1);
  });

  it('no avisa con APP_ROUTES, con navigate(-1) ni con un path relativo', async () => {
    const constant = await lintRule(
      "import { APP_ROUTES } from '../constants/routes';\nexport const f = (navigate: (p: string) => void) => navigate(APP_ROUTES.HOME);\n",
    );
    const back = await lintRule(
      'export const f = (navigate: (p: number) => void) => navigate(-1);\n',
    );
    const relative = await lintRule(
      "export const f = (navigate: (p: string) => void) => navigate('detalle');\n",
    );

    expect(constant).toHaveLength(0);
    expect(back).toHaveLength(0);
    expect(relative).toHaveLength(0);
  });

  it('no avisa en los tests, que pueden comprobar la ruta literal', async () => {
    const messages = await lintRule(
      "export const f = (navigate: (p: string) => void) => navigate('/torneos');\n",
      'src/pages/Ejemplo.test.tsx',
    );

    expect(messages).toHaveLength(0);
  });
});
