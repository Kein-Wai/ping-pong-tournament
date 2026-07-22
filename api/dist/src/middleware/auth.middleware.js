"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.requireAdminClub = exports.requireSuperAdmin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Nivel 1: Dios (Solo para ti)
const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Usuario no autenticado' });
        return;
    }
    if (req.user.role !== 'SuperAdmin') {
        res
            .status(403)
            .json({ error: 'Acceso denegado. Solo el SuperAdmin puede realizar esta acción.' });
        return;
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
// Nivel 2: Presidentes de Club (Tú también puedes pasar por aquí)
const requireAdminClub = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Usuario no autenticado' });
        return;
    }
    if (req.user.role !== 'SuperAdmin' && req.user.role !== 'AdminClub') {
        res
            .status(403)
            .json({ error: 'Acceso denegado. Se requieren permisos de Administrador de Club.' });
        return;
    }
    next();
};
exports.requireAdminClub = requireAdminClub;
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res
            .status(401)
            .json({ error: 'Acceso denegado. Token no proporcionado o formato incorrecto.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Token inválido o expirado.' });
    }
};
exports.verifyToken = verifyToken;
