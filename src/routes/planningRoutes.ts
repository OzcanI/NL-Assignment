import { Router } from 'express';
import { PlanningController } from '../controllers/planningController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);

// Planlama servisi durumu
router.get('/status', PlanningController.getPlanningStatus);

// Manuel tetikleme (test için)
router.post('/trigger', PlanningController.triggerPlanning);

// Servis kontrolü
router.post('/stop', PlanningController.stopPlanning);
router.post('/start', PlanningController.startPlanning);

export default router; 