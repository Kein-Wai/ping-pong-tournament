import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../../src/middleware/auth.middleware';

// Mockeamos jsonwebtoken
vi.mock('jsonwebtoken');

describe('Auth Middleware (verifyToken)', () => {
  // Fabricamos nuestros objetos de Express "de mentira"
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reseteamos la petición antes de cada test
    mockReq = {
      headers: {},
    };

    // Fabricamos un objeto "res" que espía si llamamos a status() y json()
    mockRes = {
      status: vi.fn().mockReturnThis(), // mockReturnThis permite encadenar .status(401).json(...)
      json: vi.fn(),
    };

    // El "next" es solo una función vacía que podemos espiar
    nextFunction = vi.fn();

    process.env.JWT_SECRET = 'secreto-test';
  });

  it('FALLO: Debería bloquear si no hay cabecera de autorización (401)', () => {
    // Le pasamos los objetos vacíos
    verifyToken(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Acceso denegado. Token no proporcionado o formato incorrecto.',
    });
    expect(nextFunction).not.toHaveBeenCalled(); // Aseguramos que NO le dejó pasar
  });

  it('FALLO: Debería bloquear si el token es inválido o caducado (401)', () => {
    // Simulamos que envía un token basura
    mockReq.headers = { authorization: 'Bearer token-falso' };

    // Simulamos que jwt.verify lanza un error (que es lo que hace si el token caduca)
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('Token expired');
    });

    verifyToken(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('ÉXITO: Debería dejar pasar (next) y guardar el usuario en req si el token es válido', () => {
    const mockUserPayload = { id: '123', email: 'test@test.com', role: 'Admin' };
    mockReq.headers = { authorization: 'Bearer token-bueno' };

    // Simulamos que jwt.verify funciona y devuelve los datos del usuario
    vi.mocked(jwt.verify).mockReturnValue(mockUserPayload as any);

    verifyToken(mockReq as Request, mockRes as Response, nextFunction);

    // Comprobamos que decodificó el token y lo guardó en la petición
    expect(mockReq.user).toEqual(mockUserPayload);

    // Comprobamos que le abrió la puerta
    expect(nextFunction).toHaveBeenCalledOnce();

    // Comprobamos que NO le devolvió ningún error
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
