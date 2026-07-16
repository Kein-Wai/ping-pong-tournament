import { describe, it, expect } from 'vitest';
import {
  loginLocalSchema,
  loginGoogleSchema,
  registerSchema,
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
} from '../../src/schemas/user';

describe('Zod Schemas: Autenticación y Usuarios', () => {
  describe('loginLocalSchema & loginGoogleSchema', () => {
    it('1. loginLocalSchema debería pasar con email y password válidos', () => {
      const result = loginLocalSchema.safeParse({ email: 'test@test.com', password: '123' });
      expect(result.success).toBe(true);
    });

    it('2. loginLocalSchema debería fallar si el email es inválido', () => {
      const result = loginLocalSchema.safeParse({ email: 'no-es-un-email', password: '123' });
      expect(result.success).toBe(false);
    });

    it('3. loginGoogleSchema debería pasar con un credential válido', () => {
      const result = loginGoogleSchema.safeParse({ credential: 'token-largo-de-google' });
      expect(result.success).toBe(true);
    });
  });

  describe('registerSchema', () => {
    const validRegisterData = {
      email: 'test@test.com',
      name: 'Juan',
      password: 'Password123!',
      confirmPassword: 'Password123!',
    };

    it('4. Debería pasar con datos válidos y contraseñas que coinciden', () => {
      const result = registerSchema.safeParse(validRegisterData);
      expect(result.success).toBe(true);
    });

    it('5. Debería fallar si la contraseña no cumple la seguridad (faltan mayúsculas/símbolos)', () => {
      const result = registerSchema.safeParse({
        ...validRegisterData,
        password: 'password123',
        confirmPassword: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorString = result.error.toString();
        expect(errorString).toContain('Debe contener al menos una mayuscula');
        expect(errorString).toContain('Debe almenos contener un character especial');
      }
    });

    it('6. Debería fallar si las contraseñas no coinciden', () => {
      const result = registerSchema.safeParse({
        ...validRegisterData,
        password: 'Password123!',
        confirmPassword: 'Password1234!',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Las contraseñas no coinciden');
        expect(result.error.issues[0].path).toContain('confirmPassword');
      }
    });
  });

  describe('createUserSchema & updateUserSchema', () => {
    const validUserTypeId = '11111111-1111-4111-a111-111111111111';

    it('7. createUserSchema debería pasar sin contraseña (es opcional) y asignar ELO por defecto', () => {
      const result = createUserSchema.safeParse({
        email: 'admin@test.com',
        name: 'Admin',
        userTypeId: validUserTypeId,
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.elo).toBe(500);
      }
    });

    it('8. createUserSchema debería fallar si el userTypeId no es un UUID', () => {
      const result = createUserSchema.safeParse({
        email: 'admin@test.com',
        name: 'Admin',
        userTypeId: 'id-invalido',
      });

      expect(result.success).toBe(false);
    });

    it('9. updateUserSchema debería permitir actualizaciones parciales (ej. solo el nombre)', () => {
      const result = updateUserSchema.safeParse({
        name: 'Nuevo Nombre',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateProfileSchema', () => {
    it('10. Debería pasar si solo se actualizan datos básicos', () => {
      const result = updateProfileSchema.safeParse({
        name: 'Carlos',
        surname: 'Pérez',
      });
      expect(result.success).toBe(true);
    });

    it('11. Debería pasar si se cambia la contraseña y coinciden', () => {
      const result = updateProfileSchema.safeParse({
        newPassword: 'NuevaPassword123',
        confirmPassword: 'NuevaPassword123',
      });
      expect(result.success).toBe(true);
    });

    it('12. Debería fallar si se envía una nueva contraseña pero no coinciden', () => {
      const result = updateProfileSchema.safeParse({
        newPassword: 'NuevaPassword123',
        confirmPassword: 'OtraPassword',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Las contraseñas no coinciden');
      }
    });
  });
});
