import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

// Con el cliente sin avisos de dependencias de hooks, react-hooks/exhaustive-deps
// pasa de aviso a error en eslint.config.js para que un efecto con dependencias
// olvidadas no vuelva a colarse. Aquí se ejecuta ESLint de verdad sobre código de
// ejemplo (los tests del cliente se lanzan siempre desde client/).
const eslint = new ESLint();

const RULE = 'react-hooks/exhaustive-deps';

const lintRule = async (code: string, filePath = 'src/pages/Ejemplo.tsx') => {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === RULE);
};

describe('regla exhaustive-deps', () => {
  it('falla (error) cuando un efecto usa algo que no declara como dependencia', async () => {
    const messages = await lintRule(
      "import { useEffect } from 'react';\nexport const useX = (id: string) => {\n  useEffect(() => {\n    console.info(id);\n  }, []);\n};\n",
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
  });

  it('no avisa cuando las dependencias están completas', async () => {
    const messages = await lintRule(
      "import { useEffect } from 'react';\nexport const useX = (id: string) => {\n  useEffect(() => {\n    console.info(id);\n  }, [id]);\n};\n",
    );

    expect(messages).toHaveLength(0);
  });
});
