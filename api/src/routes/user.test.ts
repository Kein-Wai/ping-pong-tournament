import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import prisma from '../../src/db';
import bcrypt from 'bcryptjs';
// Interceptamos la instancia de Prisma
vi.mock('../../src/db', () => ({
  default: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = { id: 'user-id-123', email: 'test@test.com', role: 'Player' };
    next();
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
    password: 'hashed-password-fake',
    authProvider: 'LOCAL',
    googleId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Limpiamos los mocks antes de cada test para que no se mezclen los contadores
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe('PUT /api/users/me (Actualizar Perfil con Confirmación de Contraseña)', () => {
    it('Debería actualizar nombre y apellidos sin tocar contraseña', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-id-123' } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'user-id-123',
        name: 'Nuevo',
        surname: 'Nombre',
      } as any);

      const response = await request(app)
        .put('/api/users/me')
        .send({ name: 'Nuevo', surname: 'Nombre' });

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe('Nuevo');
    });

    it('Debería fallar (400) si intenta cambiar contraseña sin proveer la actual', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-id-123',
        password: 'hash_cualquiera',
      } as any);

      const response = await request(app).put('/api/users/me').send({
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Debes proporcionar tu contraseña actual para cambiarla');
    });

    it('Debería fallar (400) si newPassword y confirmPassword NO coinciden', async () => {
      const response = await request(app).put('/api/users/me').send({
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
        confirmPassword: 'diferentepassword123',
      });

      expect(response.status).toBe(400);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('Debería fallar (401) si la contraseña actual es incorrecta', async () => {
      // 1. Generamos un hash real de la palabra "mi-contraseña-real"
      const realHash = await bcrypt.hash('mi-contraseña-real', 1);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-id-123',
        password: realHash, // La BBDD devuelve el hash real
      } as any);

      const response = await request(app).put('/api/users/me').send({
        currentPassword: 'contraseña-equivocada', // 2. Enviamos una equivocada a propósito
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(response.status).toBe(401); // El bcrypt REAL de tu ruta lo bloqueará con éxito
    });

    it('Debería cambiar la contraseña si la actual es correcta y las nuevas coinciden', async () => {
      // 1. Generamos un hash real
      const realHash = await bcrypt.hash('mi-contraseña-real', 1);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-id-123',
        password: realHash,
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({ id: 'user-id-123' } as any);

      const response = await request(app).put('/api/users/me').send({
        currentPassword: 'mi-contraseña-real', // 2. Enviamos la correcta, ¡hará match!
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(response.status).toBe(200);

      // 3. Comprobamos que Prisma recibió la orden de actualizar con un String cualquiera (el nuevo hash)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-id-123' },
          data: expect.objectContaining({
            password: expect.any(String),
          }),
        }),
      );
    });
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

  it('POST / - debería dar error de validación (400)', async () => {
    // Simulamos la respuesta de creación exitosa
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

    const newUserPayload = {
      email: 12311,
      name: 'ca',
      surname: 'e', // <-- Añadido
      userTypeId: 2,
    };

    const response = await request(app).post('/api/users').send(newUserPayload);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Datos de entrada inválidos');
    expect(response.body.details.properties).toHaveProperty('email');
  });

  it('GET /:id - debería devolver un usuario (200)', async () => {
    // Simulamos que la BD devuelve un array con nuestro usuario
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

    const response = await request(app).get('/api/users/123e4567-e89b-12d3-a456-426614174000');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUser);
    expect(prisma.user.findUnique).toHaveBeenCalledOnce();
  });

  it('PUT /:id - debería actualizar un usuario existente (200)', async () => {
    const updatedUser = { ...mockUser, name: 'Rafa' };

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

  it('PUT /:id  - debería dar error de validación (400)', async () => {
    const updatedUser = { ...mockUser, name: 'Rafa' };

    // Simulamos la respuesta de actualización exitosa
    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

    const updatePayload = {
      email: 12311,
      name: 'ca',
      surname: 'e', // <-- Añadido
      userTypeId: 2,
    };

    const response = await request(app)
      .put('/api/users/123e4567-e89b-12d3-a456-426614174000')
      .send(updatePayload);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Datos de entrada inválidos');
    expect(response.body.details.properties).toHaveProperty('email');
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
