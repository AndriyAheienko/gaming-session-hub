import { Router } from 'express';
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getUserFriends,
} from '../controllers/friendsControllers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/:userId', protect, sendFriendRequest);
router.get('/', protect, getUserFriends);
router.patch('/:friendshipId/accept', protect, acceptFriendRequest);
router.patch('/:friendshipId/reject', protect, rejectFriendRequest);

export default router;
