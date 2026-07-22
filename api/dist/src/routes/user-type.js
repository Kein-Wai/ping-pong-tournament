"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.requireSuperAdmin, async (req, res) => {
    try {
        const userTypes = await db_1.default.userType.findMany();
        res.json(userTypes);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al obtener los tipos de usuario' });
    }
});
exports.default = router;
