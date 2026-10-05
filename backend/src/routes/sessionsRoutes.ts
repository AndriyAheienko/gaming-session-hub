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
    startSession,
    completeSession,
    cancelSession,
    getSessionMessages,
} from '../controllers/sessionsControllers.js';
import { rateSessionMember } from '../controllers/ratingsControllers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getSessions);
router.post('/', protect, createSession);

router.get('/invitations', protect, getSessionsInvitations);

router.patch('/invitations/:invitationId/accept', protect, acceptSessionInvitation);
router.patch('/invitations/:invitationId/reject', protect, rejectSessionInvitation);

router.get('/:sessionId/members', getSessionMembers);
router.get('/:sessionId/messages', getSessionMessages);

router.post('/:sessionId/invitations/:receiverId', protect, sendSessionInvitation);
router.post('/:sessionId/ratings', protect, rateSessionMember);

router.patch('/:sessionId/start', protect, startSession);
router.patch('/:sessionId/complete', protect, completeSession);
router.patch('/:sessionId/cancel', protect, cancelSession);

router.post('/:sessionId/join', protect, joinSession);
router.delete('/:sessionId/leave', protect, leaveSession);

router.get('/:sessionId', getSessionById);

export default router;
