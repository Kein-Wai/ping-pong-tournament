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
  refreshTokenSchema,
} from '../schemas/user';
import { z } from 'zod';
import { enviarCorreoGenerico } from '../services/email';
import { templateRegistro, templateResetPassword } from '../utils/emailtemplate';
import crypto from 'crypto';
import { resolveCurrentSeason } from '../utils/season';
import { asyncHandler, sendData, sendError, sendMessage } from '../http/response';
import {
  loginLimiter,
  passwordResetLimiter,
  refreshLimiter,
  registerLimiter,
} from '../middleware/rate-limit';
import { revokeAllUserSessions, revokeRefreshToken, rotateRefreshToken, startSession } from '../utils/refresh-token';

const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.get('/verify/:token', asyncHandler(async (req, res) => {
  const { token } = req.params as { [key: string]: string };
  if (!token || token === '') {
    return sendError(res, 400, 'Token inválidos', 'Token invalido');
  }
  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
    include: { userType: true },
  });

  if (!user || !user.password) {
    return sendError(res, 401, 'Token incorrecto o el usuario no existe');
  }

  await prisma.user.update({
    where: { email: user.email },
    data: { active: true, verificationToken: null },
  });

  const baseUrl = process.env.CLIENT_URL || 'https://tt-app-5mdc.onrender.com';
  res.redirect(`${baseUrl}/login?verified=true`);

}, 'Error al verificar el jugador', 500));

router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  const validation = registerSchema.safeParse(req.body);
  if (!validation.success) {
    sendError(res, 400, 'Datos inválidos', z.treeifyError(validation.error));
    return;
  }

  const { email, password, name, surname, role } = validation.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  const userRole = await prisma.userType.findUnique({ where: { name: role } });

  if (existingUser) {
    sendError(res, 400, 'El email ya está registrado');
    return;
  }

  if (!userRole) {
    sendError(res, 500, 'Error interno: Rol de jugador no configurado');
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

  sendMessage(res, 'Jugador registrado con éxito', 201);

}, 'Error al registrar el jugador', 500));

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const validation = loginLocalSchema.safeParse(req.body);
  if (!validation.success) return sendError(res, 400, 'Datos invalidos');
  const { email, password } = validation.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { userType: true },
  });

  if (!user || !user.password) {
    return sendError(res, 401, 'Credenciales incorrectas o el usuario usa otro método de acceso');
  }

  if (!user.active) {
    return sendError(res, 401, 'Email no ha sido verificado aun, por favor revisa tu bandeja.');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return sendError(res, 401, 'Credenciales incorrectas');
  }

  const tokens = await startSession(user);

  sendMessage(res, 'Login local exitoso', 200, tokens);

}, 'Error en el servidor', 500));

router.post('/google', loginLimiter, asyncHandler(async (req, res) => {
  const validation = loginGoogleSchema.safeParse(req.body);
  if (!validation.success) return sendError(res, 400, 'Token requerido');

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
    return sendError(res, 401, 'Token de Google inválido');
  }

  // Un correo sin verificar no prueba que la cuenta de Google sea de su dueño: aceptarlo
  // permitiría tomar la cuenta existente con ese email (se vincula por correo).
  if (!payload.email_verified) {
    return sendError(res, 401, 'El correo de la cuenta de Google no está verificado');
  }

  const { email, given_name, family_name, sub: googleId, picture } = payload;

  let user = await prisma.user.findUnique({
    where: { email },
    include: { userType: true },
  });

  if (!user) {
    if (!userRole) {
      return sendError(res, 500, 'Configuración de base de datos incompleta (Falta rol Player)');
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

  const tokens = await startSession(user);

  sendMessage(res, 'Login con Google exitoso', 200, tokens);

}, 'Fallo al autenticar con Google', 401));

router.post('/refresh', refreshLimiter, asyncHandler(async (req, res) => {
  const validation = refreshTokenSchema.safeParse(req.body);
  if (!validation.success) return sendError(res, 400, 'Refresh token requerido');

  const tokens = await rotateRefreshToken(validation.data.refreshToken);
  if (!tokens) return sendError(res, 401, 'Sesión caducada');

  sendData(res, tokens);
}, 'Error al renovar la sesión', 500));

router.post('/logout', asyncHandler(async (req, res) => {
  const validation = refreshTokenSchema.safeParse(req.body);
  if (!validation.success) return sendError(res, 400, 'Refresh token requerido');

  await revokeRefreshToken(validation.data.refreshToken);

  sendMessage(res, 'Sesión cerrada');
}, 'Error al cerrar la sesión', 500));

// POST: Solicitar recuperación de contraseña
router.post('/forgot-password', passwordResetLimiter, asyncHandler(async (req, res) => {
  const validation = forgotPasswordSchema.safeParse(req.body);
  if (!validation.success) return sendError(res, 400, 'Email inválido');

  const { email } = validation.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Por seguridad, si no existe no damos detalles, simplemente devolvemos un 200
  if (!user) {
    return sendMessage(res, 'Si el correo existe, se han enviado las instrucciones.');
  }

  if (user.authProvider === 'GOOGLE') {
    return sendError(res, 400, 'Esta cuenta utiliza el inicio de sesión de Google. Por favor, inicia sesión con Google.');
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

  sendMessage(res, 'Si el correo existe, se han enviado las instrucciones.');

}, 'Error al procesar la solicitud', 500));

// POST: Establecer nueva contraseña con el token
router.post('/reset-password', passwordResetLimiter, asyncHandler(async (req, res) => {
  const validation = resetPasswordSchema.safeParse(req.body);
  if (!validation.success) {
    return sendError(res, 400, validation.error.issues[0].message);
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
    return sendError(res, 400, 'El enlace de recuperación es inválido o ha expirado.');
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

  // Quien tuviera la contraseña vieja (o una sesión robada) no debe seguir dentro.
  await revokeAllUserSessions(user.id);

  sendMessage(res, 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.');

}, 'Error al restablecer la contraseña', 500));

export default router;
