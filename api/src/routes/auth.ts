import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../db';
import { loginLocalSchema, loginGoogleSchema, registerSchema } from '../schemas/user';
import { z } from 'zod';

const router = Router();

// Cliente de Google
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// --- RUTA 3: REGISTRO PÚBLICO DE JUGADOR ---
router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
      return;
    }

    // Extraemos solo los datos que necesitamos (ignoramos confirmPassword)
    const { email, password, name, surname } = validation.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'El email ya está registrado' });
      return;
    }

    const playerRole = await prisma.userType.findUnique({ where: { name: 'Player' } });
    if (!playerRole) {
      res.status(500).json({ error: 'Error interno: Rol de jugador no configurado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        surname,
        authProvider: 'LOCAL',
        userTypeId: playerRole.id,
        stats: {
          create: {}, // Crea la fila vinculada automáticamente asumiendo el default(500)
        },
      },
      include: { userType: true },
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.userType.name },
      JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.status(201).json({
      message: 'Jugador registrado con éxito',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.userType.name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el jugador' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const validation = loginLocalSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: 'Datos invalidos' });
    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { userType: true },
    });

    // Si no existe o se registró con Google y no tiene contraseña local
    if (!user || !user.password) {
      return res
        .status(401)
        .json({ error: 'Credenciales incorrectas o el usuario usa otro método de acceso' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.userType.name },
      JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.status(200).json({ message: 'Login local exitoso', token });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// --- RUTA 2: LOGIN CON GOOGLE ---
router.post('/google', async (req, res) => {
  try {
    const validation = loginGoogleSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: 'Token requerido' });

    const { credential } = validation.data;

    // 1. Verificar el token con los servidores de Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Token de Google inválido' });
    }

    const { email, given_name, family_name, sub: googleId } = payload;

    // 2. Buscar si el usuario ya existe en nuestra BD
    let user = await prisma.user.findUnique({
      where: { email },
      include: { userType: true },
    });

    // 3. Si no existe, lo creamos sobre la marcha (Registro automático)
    if (!user) {
      // Buscamos el ID del rol "Player" para asignarlo por defecto
      const playerRole = await prisma.userType.findUnique({ where: { name: 'Player' } });

      if (!playerRole) {
        return res
          .status(500)
          .json({ error: 'Configuración de base de datos incompleta (Falta rol Player)' });
      }

      user = await prisma.user.create({
        data: {
          email,
          name: given_name || 'Usuario',
          surname: family_name,
          authProvider: 'GOOGLE',
          googleId,
          userTypeId: playerRole.id,
          stats: {
            create: {}, // Crea la fila vinculada automáticamente asumiendo el default(500)
          },
        },
        include: { userType: true },
      });
    } else if (!user.googleId) {
      // 4. (Opcional) Si existía de forma Local, vinculamos su cuenta de Google
      user = await prisma.user.update({
        where: { email },
        data: { googleId, authProvider: 'GOOGLE' },
        include: { userType: true },
      });
    }

    // 5. Generar NUESTRO propio JWT, independientemente de si es nuevo o antiguo
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.userType.name },
      JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.status(200).json({ message: 'Login con Google exitoso', token });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Fallo al autenticar con Google' });
  }
});

export default router;
