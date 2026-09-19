import { Router } from 'express';
import {
    createSession,
    getSessions,
    getSessionById,
    joinSession,
    getSessionMembers,
    leaveSession,
} from '../controllers/sessionControllers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', protect, createSession);
router.get('/', getSessions);
router.get('/:id', getSessionById);
router.get('/:id/members', getSessionMembers);
router.post('/:id/join', protect, joinSession);
router.delete('/:id/leave', protect, leaveSession);

export default router;
