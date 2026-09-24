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
} from '../controllers/sessionsControllers.js';
import { rateSessionMember } from '../controllers/ratingsControllers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getSessions);
router.post('/', protect, createSession);

router.get('/invitations', protect, getSessionsInvitations);

router.patch('/invitations/:invitationId/accept', protect, acceptSessionInvitation);
router.patch('/invitations/:invitationId/reject', protect, rejectSessionInvitation);

router.get('/:id/members', getSessionMembers);

router.post('/:sessionId/invitations/:userId', protect, sendSessionInvitation);
router.post('/:sessionId/ratings', protect, rateSessionMember);

router.post('/:id/join', protect, joinSession);
router.delete('/:id/leave', protect, leaveSession);

router.get('/:id', getSessionById);

export default router;
