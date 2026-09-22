import { Router } from 'express';
import {
    createSession,
    getSessions,
    getSessionById,
    joinSession,
    getSessionMembers,
    leaveSession,
    sendSessionInvitation,
    acceptSessionInvitation,
    rejectSessionInvitation,
    getSessionsInvitations,
} from '../controllers/sessionControllers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', protect, createSession);
router.get('/', getSessions);
router.get('/invitations', protect, getSessionsInvitations);
router.get('/:id', getSessionById);
router.get('/:id/members', getSessionMembers);
router.post('/:sessionId/invitations/:userId', protect, sendSessionInvitation);
router.patch('/invitations/:invitationId/accept', protect, acceptSessionInvitation);
router.patch('/invitations/:invitationId/reject', protect, rejectSessionInvitation);
router.post('/:id/join', protect, joinSession);
router.delete('/:id/leave', protect, leaveSession);

export default router;
