import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  verifyToken,
  requireSuperAdmin,
  requireAdminClub,
} from '../../src/middleware/auth.middleware';

// Mockeamos jsonwebtoken
vi.mock('jsonwebtoken');

describe('Auth Middleware (verifyToken)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    nextFunction = vi.fn();
    process.env.JWT_SECRET = 'secreto-test';
  });

  it('FALLO: Debería bloquear si no hay cabecera de autorización (401)', () => {
    verifyToken(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Acceso denegado. Token no proporcionado o formato incorrecto.',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('FALLO: Debería bloquear si el token es inválido o caducado (401)', () => {
    mockReq.headers = { authorization: 'Bearer token-falso' };

    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('Token expired');
    });

    verifyToken(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('ÉXITO: Debería dejar pasar (next) y guardar el usuario en req si el token es válido', () => {
    const mockUserPayload = { id: '123', email: 'test@test.com', role: 'SuperAdmin' };
    mockReq.headers = { authorization: 'Bearer token-bueno' };

    vi.mocked(jwt.verify).mockReturnValue(mockUserPayload as any);

    verifyToken(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockReq.user).toEqual(mockUserPayload);
    expect(nextFunction).toHaveBeenCalledOnce();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});

describe('Auth Middleware (requireSuperAdmin)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  it('FALLO: Debería bloquear (401) si no hay usuario en la petición', () => {
    requireSuperAdmin(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Usuario no autenticado' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('FALLO: Debería bloquear (403) si el usuario es AdminClub o Player', () => {
    // Simulamos un presidente de club intentando colarse en rutas de sistema
    mockReq.user = { id: '123', email: 'club@test.com', role: 'AdminClub' };

    requireSuperAdmin(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Acceso denegado. Solo el SuperAdmin puede realizar esta acción.',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('ÉXITO: Debería dejar pasar (next) si el usuario es SuperAdmin', () => {
    mockReq.user = { id: '456', email: 'super@test.com', role: 'SuperAdmin' };

    requireSuperAdmin(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledOnce();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});

describe('Auth Middleware (requireAdminClub)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  it('FALLO: Debería bloquear (401) si no hay usuario en la petición', () => {
    requireAdminClub(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('FALLO: Debería bloquear (403) si el usuario es Player', () => {
    mockReq.user = { id: '123', email: 'player@test.com', role: 'Player' };

    requireAdminClub(mockReq as Request, mockRes as Response, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Acceso denegado. Se requieren permisos de Administrador de Club.',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('ÉXITO: Debería dejar pasar (next) si el usuario es AdminClub', () => {
    mockReq.user = { id: '456', email: 'adminclub@test.com', role: 'AdminClub' };

    requireAdminClub(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledOnce();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('ÉXITO: Debería dejar pasar (next) si el usuario es SuperAdmin', () => {
    mockReq.user = { id: '789', email: 'super@test.com', role: 'SuperAdmin' };

    // El SuperAdmin también tiene derechos de gestión en los clubes
    requireAdminClub(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledOnce();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
