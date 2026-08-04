import { Router } from 'express';
import userTypeRoutes from './user-type';
import userRoutes from './user';
import authRoutes from './auth';
import matchRoutes from './match';
import tournamentRoutes from './tournament';
import clubRoutes from './club';
import { verifyToken } from '../middleware/auth.middleware';
import { enviarCorreoGenerico } from '../services/email';

const router = Router();

router.use('/auth', authRoutes);
router.use('/clubs', clubRoutes);
router.use('/user-types', verifyToken, userTypeRoutes);
router.use('/users', verifyToken, userRoutes);
router.use('/matches', verifyToken, matchRoutes);
router.use('/tournaments', verifyToken, tournamentRoutes);
// router.get('/test-email', async (req, res) => {
//   try {
//     await enviarCorreoGenerico('keinwaicheung@gmail.com', 'Email Test', '<h1>ESTO ES UN TEST</h1>');

//     res.status(200).json({ message: 'Email Sent' });
//   } catch (error) {
//     res.status(500).json({ success: false, error: 'Error al enviar email' });
//     console.log(error);
//   }
// });
export default router;
