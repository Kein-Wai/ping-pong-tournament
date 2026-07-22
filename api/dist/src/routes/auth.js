"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
const db_1 = __importDefault(require("../db"));
const user_1 = require("../schemas/user");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
router.post('/register', async (req, res) => {
    try {
        const validation = user_1.registerSchema.safeParse(req.body);
        console.log('body', req.body);
        if (!validation.success) {
            console.log(validation);
            res.status(400).json({ error: 'Datos inválidos', details: zod_1.z.treeifyError(validation.error) });
            return;
        }
        const { email, password, name, surname, role } = validation.data;
        console.log('validation', validation.data);
        const existingUser = await db_1.default.user.findUnique({ where: { email } });
        const userRole = await db_1.default.userType.findUnique({ where: { name: role } });
        if (existingUser) {
            res.status(400).json({ error: 'El email ya está registrado' });
            return;
        }
        if (!userRole) {
            res.status(500).json({ error: 'Error interno: Rol de jugador no configurado' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newUser = await db_1.default.user.create({
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
        const token = jsonwebtoken_1.default.sign({
            id: newUser.id, // (Usa user o newUser dependiendo de la ruta en la que estés)
            email: newUser.email,
            name: newUser.name,
            surname: newUser.surname,
            role: newUser.userType?.name,
            clubId: newUser.clubId,
            clubStatus: newUser.clubStatus,
        }, JWT_SECRET, { expiresIn: '8h' });
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar el jugador' });
    }
});
router.post('/login', async (req, res) => {
    try {
        const validation = user_1.loginLocalSchema.safeParse(req.body);
        if (!validation.success)
            return res.status(400).json({ error: 'Datos invalidos' });
        const { email, password } = validation.data;
        const user = await db_1.default.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { userType: true },
        });
        if (!user || !user.password) {
            return res
                .status(401)
                .json({ error: 'Credenciales incorrectas o el usuario usa otro método de acceso' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            name: user.name,
            surname: user.surname,
            nickname: user.nickname,
            email: user.email,
            role: user.userType.name,
            clubId: user.clubId,
            clubStatus: user.clubStatus,
        }, JWT_SECRET, { expiresIn: '8h' });
        res.status(200).json({ message: 'Login local exitoso', token });
    }
    catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
});
router.post('/google', async (req, res) => {
    try {
        const validation = user_1.loginGoogleSchema.safeParse(req.body);
        if (!validation.success)
            return res.status(400).json({ error: 'Token requerido' });
        const { credential, role } = validation.data;
        const userRole = await db_1.default.userType.findUnique({ where: { name: role } });
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            return res.status(401).json({ error: 'Token de Google inválido' });
        }
        const { email, given_name, family_name, sub: googleId } = payload;
        let user = await db_1.default.user.findUnique({
            where: { email },
            include: { userType: true },
        });
        if (!user) {
            if (!userRole) {
                return res
                    .status(500)
                    .json({ error: 'Configuración de base de datos incompleta (Falta rol Player)' });
            }
            user = await db_1.default.user.create({
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
        }
        else if (!user.googleId) {
            user = await db_1.default.user.update({
                where: { email },
                data: { googleId, authProvider: 'GOOGLE' },
                include: { userType: true },
            });
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            name: user.name,
            surname: user.surname,
            nickname: user.nickname,
            role: user.userType.name,
            clubId: user.clubId,
            clubStatus: user.clubStatus,
        }, JWT_SECRET, { expiresIn: '8h' });
        res.status(200).json({ message: 'Login con Google exitoso', token });
    }
    catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Fallo al autenticar con Google' });
    }
});
exports.default = router;
