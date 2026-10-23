import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from './errors';

describe('Extraccion del mensaje de error (client/src/api/errors.ts)', () => {
  it('usa el campo error de la API', () => {
    expect(extractErrorMessage({ success: false, error: 'No autorizado' }, 'fallback')).toBe(
      'No autorizado',
    );
  });

  it('usa el texto por defecto si la API no aporta mensaje', () => {
    expect(extractErrorMessage({ success: false }, 'fallback')).toBe('fallback');
  });

  it('usa el texto por defecto si el cuerpo no es un objeto', () => {
    expect(extractErrorMessage('texto plano', 'fallback')).toBe('fallback');
    expect(extractErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('lee los errores por campo del formato flatten de Zod', () => {
    const body = {
      success: false,
      error: 'Datos invalidos',
      details: {
        formErrors: [],
        fieldErrors: { email: ['Invalid email address'] },
      },
    };

    expect(extractErrorMessage(body, 'fallback')).toBe('email: Invalid email address');
  });

  it('lee los errores por campo del formato treeify de Zod', () => {
    const body = {
      success: false,
      error: 'Datos invalidos',
      details: {
        errors: [],
        properties: { email: { errors: ['Invalid email address'] } },
      },
    };

    expect(extractErrorMessage(body, 'fallback')).toBe('email: Invalid email address');
  });

  it('concatena varios errores por campo', () => {
    const body = {
      details: {
        fieldErrors: {
          email: ['Invalid email address'],
          age: ['Too small'],
        },
      },
    };

    expect(extractErrorMessage(body, 'fallback')).toBe(
      'email: Invalid email address | age: Too small',
    );
  });

  it('no revienta cuando details existe pero no tiene la forma esperada', () => {
    expect(extractErrorMessage({ details: {} }, 'fallback')).toBe('fallback');
    expect(extractErrorMessage({ details: { fieldErrors: null } }, 'fallback')).toBe('fallback');
    expect(extractErrorMessage({ details: 'texto' }, 'fallback')).toBe('fallback');
  });

  it('prefiere el detalle de validacion sobre el mensaje generico', () => {
    const body = {
      success: false,
      error: 'Datos invalidos',
      details: { fieldErrors: { email: ['Invalid email address'] } },
    };

    expect(extractErrorMessage(body, 'fallback')).toBe('email: Invalid email address');
  });

  it('serializa un error que llega como objeto', () => {
    expect(extractErrorMessage({ error: { code: 42 } }, 'fallback')).toBe('{"code":42}');
  });
});
