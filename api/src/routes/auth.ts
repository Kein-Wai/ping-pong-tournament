import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../db';
import {
  loginLocalSchema,
  loginGoogleSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/user';
import { z } from 'zod';
import { enviarCorreoGenerico } from '../services/email';
import { templateRegistro, templateResetPassword } from '../utils/emailtemplate';
import crypto from 'crypto';
import { getCurrentSeason } from '../utils/season';

const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || token === '') {
      return res.status(400).json({ error: 'Token inválidos', details: 'Token invalido' });
    }
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
      include: { userType: true },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Token incorrecto o el usuario no existe' });
    }

    await prisma.user.update({
      where: { email: user.email },
      data: { active: true, verificationToken: null },
    });

    const baseUrl = process.env.CLIENT_URL || 'https://tt-app-5mdc.onrender.com';
    res.redirect(`${baseUrl}/login?verified=true`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al verificar el jugador' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ error: 'Datos inválidos', details: z.treeifyError(validation.error) });
      return;
    }

    const { email, password, name, surname, role } = validation.data;

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
    const verificationToken = crypto.randomBytes(64).toString('hex');
    const currentSeason = await getCurrentSeason(prisma);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        surname,
        authProvider: 'LOCAL',
        userTypeId: userRole.id,
        stats: {
          create: { seasonId: currentSeason.id },
        },
        verificationToken: verificationToken,
      },
      include: { userType: true },
    });

    if (newUser)
      enviarCorreoGenerico(
        email.toLowerCase(),
        'Nuevo registro en TT Tournament App',
        templateRegistro(name, verificationToken),
      ).catch((err) => console.error('Fallo silencioso al enviar correo de registro:', err));

    res.status(201).json({
      message: 'Jugador registrado con éxito',
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

    if (!user.active) {
      return res
        .status(401)
        .json({ error: 'Email no ha sido verificado aun, por favor revisa tu bandeja.' });
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
        avatarUrl: user.avatarUrl,
        email: user.email,
        role: user.userType.name,
        clubId: user.clubId,
        clubStatus: user.clubStatus,
        dominantHand: user.dominantHand,
        playstyle: user.playstyle,
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

    const allowedAudiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_ID_IOS,
    ].filter(Boolean) as string[];

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: allowedAudiences,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ error: 'Token de Google inválido' });
    }

    const { email, given_name, family_name, sub: googleId, picture } = payload;

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
      const currentSeason = await getCurrentSeason(prisma);
      user = await prisma.user.create({
        data: {
          email,
          name: given_name || 'Usuario',
          surname: family_name,
          authProvider: 'GOOGLE',
          googleId,
          avatarUrl: picture,
          userTypeId: userRole.id,
          active: true,
          stats: {
            create: { seasonId: currentSeason.id },
          },
        },
        include: { userType: true },
      });
    } else {
      user = await prisma.user.update({
        where: { email },
        data: { googleId, authProvider: 'GOOGLE', avatarUrl: picture, active: true },
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
        avatarUrl: user.avatarUrl,
        role: user.userType.name,
        clubId: user.clubId,
        clubStatus: user.clubStatus,
        dominantHand: user.dominantHand,
        playstyle: user.playstyle,
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

// POST: Solicitar recuperación de contraseña
router.post('/forgot-password', async (req, res) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ error: 'Email inválido' });

    const { email } = validation.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Por seguridad, si no existe no damos detalles, simplemente devolvemos un 200
    if (!user) {
      return res
        .status(200)
        .json({ message: 'Si el correo existe, se han enviado las instrucciones.' });
    }

    if (user.authProvider === 'GOOGLE') {
      return res.status(400).json({
        error:
          'Esta cuenta utiliza el inicio de sesión de Google. Por favor, inicia sesión con Google.',
      });
    }

    // Generamos un token seguro y caducidad de 1 hora
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hora desde ahora

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordExpires: tokenExpiry },
    });

    enviarCorreoGenerico(
      user.email,
      'Recuperación de Contraseña - TT Tournament App',
      templateResetPassword(user.name, resetToken),
    ).catch((err) => console.error('Error enviando correo de reset:', err));

    res.status(200).json({ message: 'Si el correo existe, se han enviado las instrucciones.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// POST: Establecer nueva contraseña con el token
router.post('/reset-password', async (req, res) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0].message });
    }

    const { token, newPassword } = validation.data;

    // Buscamos al usuario que tenga ese token y que no haya caducado
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() }, // Debe ser mayor a la fecha actual
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: 'El enlace de recuperación es inválido o ha expirado.' });
    }

    // Actualizamos la contraseña y limpiamos los tokens para que no se puedan reusar
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res
      .status(200)
      .json({ message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

export default router;
