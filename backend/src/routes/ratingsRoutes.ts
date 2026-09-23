import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { rateSessionMember } from '../controllers/ratingsControllers.js';

const router = Router();

router.post('/:sessionId/ratings', protect, rateSessionMember);

export default router;
