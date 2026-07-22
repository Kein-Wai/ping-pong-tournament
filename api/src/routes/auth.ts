import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../db';
import { loginLocalSchema, loginGoogleSchema, registerSchema } from '../schemas/user';
import { z } from 'zod';

const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    console.log('body', req.body);
    if (!validation.success) {
      console.log(validation);
      res.status(400).json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
      return;
    }

    const { email, password, name, surname, role } = validation.data;

    console.log('validation', validation.data);
    const existingUser = await prisma.user.findUnique({ where: { email } });
    const userRole = await prisma.userType.findUnique({ where: { name: role } });

    if (existingUser) {
      res.status(400).json({ error: 'El email ya está registrado' });
      return;
    }

    if (!userRole) {
      res.status(500).json({ error: 'Error interno: Rol de jugador no configurado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        surname,
        authProvider: 'LOCAL',
        userTypeId: userRole.id,
        stats: {
          create: {},
        },
      },
      include: { userType: true },
    });

    const token = jwt.sign(
      {
        id: newUser.id, // (Usa user o newUser dependiendo de la ruta en la que estés)
        email: newUser.email,
        name: newUser.name,
        surname: newUser.surname,
        role: newUser.userType?.name,
        clubId: newUser.clubId,
        clubStatus: newUser.clubStatus,
      },
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
      where: { email: email.toLowerCase() },
      include: { userType: true },
    });

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
      {
        id: user.id,
        name: user.name,
        surname: user.surname,
        nickname: user.nickname,
        email: user.email,
        role: user.userType.name,
        clubId: user.clubId,
        clubStatus: user.clubStatus,
      },
      JWT_SECRET,
      { expiresIn: '8h' },
    );

    res.status(200).json({ message: 'Login local exitoso', token });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const validation = loginGoogleSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: 'Token requerido' });

    const { credential, role } = validation.data;
    const userRole = await prisma.userType.findUnique({ where: { name: role } });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Token de Google inválido' });
    }

    const { email, given_name, family_name, sub: googleId } = payload;

    let user = await prisma.user.findUnique({
      where: { email },
      include: { userType: true },
    });

    if (!user) {
      if (!userRole) {
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
          userTypeId: userRole.id,
          stats: {
            create: {},
          },
        },
        include: { userType: true },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { email },
        data: { googleId, authProvider: 'GOOGLE' },
        include: { userType: true },
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        nickname: user.nickname,
        role: user.userType.name,
        clubId: user.clubId,
        clubStatus: user.clubStatus,
      },
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
