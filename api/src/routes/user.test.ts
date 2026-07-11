import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';

// Interceptamos la instancia de Prisma
vi.mock('../../src/db', () => ({
  default: {
    user: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('CRUD de Rutas de Usuario (/api/users)', () => {
  const MOCK_UUID = '123e4567-e89b-12d3-a456-426614174000';
  const TYPE_UUID = '987fcdeb-51a2-43d7-9012-3456789abcde';
  // Un usuario falso para usar de molde en nuestras pruebas
  const mockUser = {
    id: MOCK_UUID,
    email: 'jugador@pingpong.com',
    name: 'Carlos',
    surname: 'Alcaraz',
    secondSurname: null,
    nickname: null,
    userTypeId: TYPE_UUID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Limpiamos los mocks antes de cada test para que no se mezclen los contadores
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET / - debería devolver la lista de usuarios (200)', async () => {
    // Simulamos que la BD devuelve un array con nuestro usuario
    vi.mocked(prisma.user.findMany).mockResolvedValue([mockUser]);

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([mockUser]);
    expect(prisma.user.findMany).toHaveBeenCalledOnce();
  });

  it('POST / - debería crear un nuevo usuario (201)', async () => {
    // Simulamos la respuesta de creación exitosa
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

    const newUserPayload = {
      email: 'jugador@pingpong.com',
      name: 'Carlos',
      surname: 'Alcaraz', // <-- Añadido
      userTypeId: '123e4567-e89b-12d3-a456-426614174000',
    };

    const response = await request(app).post('/api/users').send(newUserPayload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockUser);
    expect(prisma.user.create).toHaveBeenCalledOnce();
  });

  it('PUT /:id - debería actualizar un usuario existente (200)', async () => {
    const updatedUser = { ...mockUser, name: 'Rafa Nadal' };

    // Simulamos la respuesta de actualización exitosa
    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

    const updatePayload = { name: 'Rafa Nadal' };

    const response = await request(app)
      .put('/api/users/123e4567-e89b-12d3-a456-426614174000')
      .send(updatePayload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(updatedUser);
    // Verificamos que Prisma recibió el ID correcto en formato numérico
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
      }),
    );
  });

  it('DELETE /:id - debería borrar un usuario y no devolver contenido (204)', async () => {
    // Para el delete, Prisma suele devolver el registro borrado, lo simulamos
    vi.mocked(prisma.user.delete).mockResolvedValue(mockUser);

    const response = await request(app).delete('/api/users/123e4567-e89b-12d3-a456-426614174000');

    expect(response.status).toBe(204);
    // El body debe estar vacío en un status 204
    expect(response.body).toEqual({});
    expect(prisma.user.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
      }),
    );
  });

  it('GET / - debería devolver un error 500 si la base de datos falla', async () => {
    // Forzamos un fallo en Prisma
    vi.mocked(prisma.user.findMany).mockRejectedValue('Conexión perdida');

    const response = await request(app).get('/api/users');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Error al obtener los usuarios');
  });
});
