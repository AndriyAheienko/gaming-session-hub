import { Router } from 'express';
import {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getUserFriends,
} from '../controllers/friendshipsControllers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/:receiverId', protect, sendFriendRequest);
router.get('/', protect, getUserFriends);
router.patch('/:friendshipId/accept', protect, acceptFriendRequest);
router.patch('/:friendshipId/reject', protect, rejectFriendRequest);

export default router;
