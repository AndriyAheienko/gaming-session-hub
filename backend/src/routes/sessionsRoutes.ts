import { Router } from 'express';
import {
    createSession,
    getSessions,
    getSessionById,
    joinSession,
} from '../controllers/sessionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', protect, createSession);
router.get('/', getSessions);
router.get('/:id', getSessionById);
(router.post('/:id/join', protect), joinSession);

export default router;
