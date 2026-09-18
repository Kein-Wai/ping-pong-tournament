import { Router } from 'express';
import userTypeRoutes from './user-type';
import userRoutes from './user';
import authRoutes from './auth';
import matchRoutes from './match';
import tournamentRoutes from './tournament';
import exerciseRoutes from './exercise';
import trainingRoutes from './training';
import webhookRoutes from './webhook';
import clubRoutes from './club';
import { verifyToken } from '../middleware/auth.middleware';
import manualMatchRoutes from './manual-match';
import skillsRoutes from './skill';
import generalTrainingRoutes from './general-training';

const router = Router();

router.use('/auth', authRoutes);
router.use('/clubs', clubRoutes);
router.use('/user-types', verifyToken, userTypeRoutes);
router.use('/users', verifyToken, userRoutes);
router.use('/matches', verifyToken, matchRoutes);
router.use('/tournaments', verifyToken, tournamentRoutes);
router.use('/exercises', verifyToken, exerciseRoutes);
router.use('/trainings', verifyToken, trainingRoutes);
router.use('/manual-matches', verifyToken, manualMatchRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/skills', verifyToken, skillsRoutes);
router.use('/general-trainings', verifyToken, generalTrainingRoutes);

export default router;
