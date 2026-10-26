import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

// La regla no-restricted-imports de eslint.config.js evita que pantallas, hooks y
// componentes vuelvan a llamar a axios a pelo: el acceso a datos pasa por
// api/services (o por el adaptador http de api/client). Aquí se ejecuta ESLint de
// verdad sobre código de ejemplo para fijar a qué archivos afecta.
// ESLint toma como raíz el directorio de trabajo: los tests del cliente se lanzan
// siempre desde client/ (no hay package.json en la raíz del monorepo).
const eslint = new ESLint();

const RULE = 'no-restricted-imports';

const lintRule = async (code: string, filePath: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === RULE);
};

const importAxios = (from: string) => `import { api } from '${from}';\nexport const x = api;\n`;

describe('regla no-restricted-imports sobre api/axios', () => {
  it('falla (error) cuando una pantalla importa api/axios', async () => {
    const messages = await lintRule(importAxios('../../api/axios'), 'src/pages/Ejemplo.tsx');

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
    expect(messages[0].message).toContain('api/services');
  });

  it.each([
    'src/pages/Equipos/EquipoDetalles.tsx',
    'src/pages/Jugadores/JugadorPerfil.tsx',
    'src/pages/Jugadores/Jugadores.tsx',
    'src/pages/Entrenamientos/EntrenamientosGenerales.tsx',
    'src/pages/Analisis/ManualMatchTracker.tsx',
  ])('falla en %s, que ya migró en la Fase 4', async (file) => {
    const messages = await lintRule(importAxios('../../api/axios'), file);

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
  });

  it('falla cuando lo importa un hook, un componente o el store', async () => {
    const hook = await lintRule(importAxios('../api/axios'), 'src/hooks/useEjemplo.ts');
    const component = await lintRule(importAxios('../../api/axios'), 'src/components/common/Ejemplo.tsx');
    const store = await lintRule(importAxios('../api/axios'), 'src/store/ejemploStore.ts');

    expect(hook).toHaveLength(1);
    expect(component).toHaveLength(1);
    expect(store).toHaveLength(1);
  });

  it('no avisa en api/client.ts, que es el adaptador que sí lo usa', async () => {
    const messages = await lintRule(importAxios('../api/axios'), 'src/api/client.ts');

    expect(messages).toHaveLength(0);
  });

  it('no avisa en main.tsx, que registra el cierre de sesión en el interceptor', async () => {
    const messages = await lintRule(importAxios('./api/axios'), 'src/main.tsx');

    expect(messages).toHaveLength(0);
  });

  it('no avisa en los tests, que mockean esa frontera', async () => {
    const spec = await lintRule(importAxios('../../api/axios'), 'src/pages/Ejemplo.test.tsx');
    const helper = await lintRule(importAxios('../api/axios'), 'src/test/utils.tsx');

    expect(spec).toHaveLength(0);
    expect(helper).toHaveLength(0);
  });

  it('no avisa cuando se importan los servicios ni el adaptador', async () => {
    const services = await lintRule(
      "import { usersService } from '../../api/services';\nexport const x = usersService;\n",
      'src/pages/Ejemplo.tsx',
    );
    const adapter = await lintRule(
      "import { http } from '../../api/client';\nexport const x = http;\n",
      'src/pages/Ejemplo.tsx',
    );

    expect(services).toHaveLength(0);
    expect(adapter).toHaveLength(0);
  });

  it('no avisa por importar el paquete axios', async () => {
    const messages = await lintRule(
      "import axios from 'axios';\nexport const x = axios;\n",
      'src/api/axios.ts',
    );

    expect(messages).toHaveLength(0);
  });
});
