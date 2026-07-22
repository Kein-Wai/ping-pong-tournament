"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../db"));
const user_1 = require("../schemas/user");
const zod_1 = require("zod");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const role = req.user?.role;
        const clubId = req.user?.clubId;
        const playerType = await db_1.default.userType.findUnique({
            where: {
                name: 'Player',
            },
        });
        if (!playerType) {
            return res
                .status(500)
                .json({ error: 'El rol Player no está configurado en la base de datos' });
        }
        // Filtro base: Solo queremos que devuelva jugadores (no otros admins)
        let whereClause = {
            userTypeId: playerType.id,
        };
        // Filtro de Club:
        if (role === 'SuperAdmin') {
            // El SuperAdmin puede ver absolutamente a todos los jugadores del sistema
        }
        else if (role === 'AdminClub') {
            // El AdminClub solo puede ver a los jugadores que pertenecen a SU club
            whereClause.clubId = clubId;
        }
        else {
            // Un jugador normal solo debería poder ver el ranking/lista de la gente de su propio club
            whereClause.clubId = clubId;
        }
        const users = await db_1.default.user.findMany({
            where: whereClause,
            select: {
                id: true,
                email: true,
                name: true,
                surname: true,
                userTypeId: true,
                clubId: true,
                clubStatus: true,
                stats: true,
            },
        });
        res.json(users);
    }
    catch (error) {
        console.error('DAME EL ERROR', error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});
router.post('/', auth_middleware_1.requireAdminClub, async (req, res) => {
    try {
        const role = req.user?.role;
        const adminClubId = req.user?.clubId;
        const validation = user_1.createUserSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Datos de entrada inválidos',
                details: zod_1.z.treeifyError(validation.error),
            });
            return;
        }
        const { password, clubId, clubStatus, ...userData } = validation.data;
        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcryptjs_1.default.hash(password, 10);
        }
        // LÓGICA DE CLUBES:
        let finalClubId = clubId;
        let finalClubStatus = clubStatus || 'Registrado';
        if (role === 'AdminClub') {
            // Si eres AdminClub, el jugador se va a TU club por la fuerza y entra Aprobado
            if (!adminClubId) {
                return res.status(403).json({ error: 'No tienes un club asignado para añadir jugadores' });
            }
            finalClubId = adminClubId;
            finalClubStatus = 'Aprobado';
        }
        const newUser = await db_1.default.user.create({
            data: {
                ...userData,
                password: hashedPassword,
                authProvider: password ? 'LOCAL' : 'UNKNOWN',
                clubId: finalClubId,
                clubStatus: finalClubStatus,
                stats: {
                    create: {
                        elo: userData.elo,
                    },
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
                surname: true,
                secondSurname: true,
                nickname: true,
                clubId: true,
                clubStatus: true,
            },
        });
        res.status(201).json(newUser);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
});
router.put('/me', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        const validation = user_1.updateProfileSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ error: 'Datos inválidos', details: validation.error.format() });
            return;
        }
        const data = validation.data;
        const user = await db_1.default.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.surname)
            updateData.surname = data.surname;
        if (req.body.secondSurname)
            updateData.secondSurname = req.body.secondSurname;
        if (req.body.nickname)
            updateData.nickname = req.body.nickname;
        if (data.newPassword) {
            if (user.password) {
                if (!data.currentPassword) {
                    res.status(400).json({ error: 'Debes proporcionar tu contraseña actual para cambiarla' });
                    return;
                }
                const isMatch = await bcryptjs_1.default.compare(data.currentPassword, user.password);
                if (!isMatch) {
                    res.status(401).json({ error: 'La contraseña actual es incorrecta' });
                    return;
                }
            }
            updateData.password = await bcryptjs_1.default.hash(data.newPassword, 10);
        }
        const updatedProfile = await db_1.default.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                surname: true,
                secondSurname: true,
                nickname: true,
            },
        });
        res.status(200).json({
            message: 'Perfil actualizado con éxito',
            user: updatedProfile,
        });
    }
    catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await db_1.default.user.findUnique({ where: { id: id }, include: { stats: true } });
        res.json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});
router.put('/:id', auth_middleware_1.requireAdminClub, async (req, res) => {
    try {
        const id = req.params.id;
        const role = req.user?.role;
        const adminClubId = req.user?.clubId;
        // 1. Buscamos al usuario que intentan editar
        const userToEdit = await db_1.default.user.findUnique({ where: { id } });
        if (!userToEdit) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        // 2. Filtro de Club: El presidente solo puede editar a los suyos
        if (role === 'AdminClub' && userToEdit.clubId !== adminClubId) {
            return res
                .status(403)
                .json({ error: 'No tienes permiso para editar jugadores de otros clubes' });
        }
        const validation = user_1.updateUserSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Datos de entrada inválidos',
                details: zod_1.z.treeifyError(validation.error),
            });
            return;
        }
        const { elo, ...dataToUpdate } = validation.data;
        // 3. Prevenir que un AdminClub cambie de club a un jugador a la fuerza por aquí
        if (role === 'AdminClub') {
            delete dataToUpdate.clubId;
            delete dataToUpdate.clubStatus;
        }
        const updatedUser = await db_1.default.user.update({
            where: { id: id },
            data: {
                ...dataToUpdate, // 👈 Ahora dataToUpdate ya no contiene la propiedad 'elo'
                ...(elo !== undefined && {
                    stats: {
                        upsert: {
                            create: { elo: elo },
                            update: { elo: elo },
                        },
                    },
                }),
            },
            include: {
                stats: true, // Incluimos stats en la respuesta para que el Frontend reciba el nuevo ELO
            },
        });
        res.json(updatedUser);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});
router.delete('/:id', auth_middleware_1.requireAdminClub, async (req, res) => {
    try {
        const id = req.params.id;
        const role = req.user?.role;
        const adminClubId = req.user?.clubId;
        // 1. Buscamos al usuario que intentan borrar
        const userToDelete = await db_1.default.user.findUnique({ where: { id } });
        if (!userToDelete) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        // 2. Filtro de Club: El presidente solo puede borrar a los suyos
        if (role === 'AdminClub' && userToDelete.clubId !== adminClubId) {
            return res
                .status(403)
                .json({ error: 'No tienes permiso para borrar jugadores de otros clubes' });
        }
        await db_1.default.user.delete({
            where: { id: id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al borrar el usuario' });
    }
});
exports.default = router;
