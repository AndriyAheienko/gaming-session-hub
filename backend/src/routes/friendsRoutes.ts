import { Router } from 'express';
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
} from '../controllers/friendsControllers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/:userId', protect, sendFriendRequest);
router.patch('/:friendshipId/accept', protect, acceptFriendRequest);
router.patch('/:friendshipId/reject', protect, rejectFriendRequest);

export default router;
