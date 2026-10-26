import { Router } from 'express';
import bcrypt from 'bcryptjs';
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
import { resolveCurrentSeason } from '../utils/season';
import { asyncHandler } from '../http/response';
import { issueToken } from '../utils/session';

const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.get('/verify/:token', asyncHandler(async (req, res) => {
  const { token } = req.params as { [key: string]: string };
  if (!token || token === '') {
    return res.status(400).json({ success: false, error: 'Token inválidos', details: 'Token invalido' });
  }
  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
    include: { userType: true },
  });

  if (!user || !user.password) {
    return res.status(401).json({ success: false, error: 'Token incorrecto o el usuario no existe' });
  }

  await prisma.user.update({
    where: { email: user.email },
    data: { active: true, verificationToken: null },
  });

  const baseUrl = process.env.CLIENT_URL || 'https://tt-app-5mdc.onrender.com';
  res.redirect(`${baseUrl}/login?verified=true`);

}, 'Error al verificar el jugador', 500));

router.post('/register', asyncHandler(async (req, res) => {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ success: false, error: 'Datos inválidos', details: z.treeifyError(validation.error) });
    return;
  }

  const { email, password, name, surname, role } = validation.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  const userRole = await prisma.userType.findUnique({ where: { name: role } });

  if (existingUser) {
    res.status(400).json({ success: false, error: 'El email ya está registrado' });
    return;
  }

  if (!userRole) {
    res.status(500).json({ success: false, error: 'Error interno: Rol de jugador no configurado' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(64).toString('hex');
  const currentSeason = await resolveCurrentSeason(prisma);

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

}, 'Error al registrar el jugador', 500));

router.post('/login', asyncHandler(async (req, res) => {
  const validation = loginLocalSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ success: false, error: 'Datos invalidos' });
  const { email, password } = validation.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { userType: true },
  });

  if (!user || !user.password) {
    return res
      .status(401)
      .json({ success: false, error: 'Credenciales incorrectas o el usuario usa otro método de acceso' });
  }

  if (!user.active) {
    return res
      .status(401)
      .json({ success: false, error: 'Email no ha sido verificado aun, por favor revisa tu bandeja.' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
  }

  const token = issueToken(user);

  res.status(200).json({ message: 'Login local exitoso', token });

}, 'Error en el servidor', 500));

router.post('/google', asyncHandler(async (req, res) => {
  const validation = loginGoogleSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ success: false, error: 'Token requerido' });

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
    return res.status(401).json({ success: false, error: 'Token de Google inválido' });
  }

  // Un correo sin verificar no prueba que la cuenta de Google sea de su dueño: aceptarlo
  // permitiría tomar la cuenta existente con ese email (se vincula por correo).
  if (!payload.email_verified) {
    return res
      .status(401)
      .json({ success: false, error: 'El correo de la cuenta de Google no está verificado' });
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
        .json({ success: false, error: 'Configuración de base de datos incompleta (Falta rol Player)' });
    }
    const currentSeason = await resolveCurrentSeason(prisma);
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

  const token = issueToken(user);

  res.status(200).json({ message: 'Login con Google exitoso', token });

}, 'Fallo al autenticar con Google', 401));

// POST: Solicitar recuperación de contraseña
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const validation = forgotPasswordSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ success: false, error: 'Email inválido' });

  const { email } = validation.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Por seguridad, si no existe no damos detalles, simplemente devolvemos un 200
  if (!user) {
    return res
      .status(200)
      .json({ message: 'Si el correo existe, se han enviado las instrucciones.' });
  }

  if (user.authProvider === 'GOOGLE') {
    return res.status(400).json({ success: false, error: 'Esta cuenta utiliza el inicio de sesión de Google. Por favor, inicia sesión con Google.',
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

}, 'Error al procesar la solicitud', 500));

// POST: Establecer nueva contraseña con el token
router.post('/reset-password', asyncHandler(async (req, res) => {
  const validation = resetPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, error: validation.error.issues[0].message });
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
      .json({ success: false, error: 'El enlace de recuperación es inválido o ha expirado.' });
  }

  // Actualizamos la contraseña y limpiamos los tokens para que no se puedan reusar
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      forcePasswordChange: false,
    },
  });

  res
    .status(200)
    .json({ message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });

}, 'Error al restablecer la contraseña', 500));

export default router;
