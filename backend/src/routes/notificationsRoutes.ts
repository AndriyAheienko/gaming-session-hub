import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    getNotifications,
    notificationRead,
    allNotificationsRead,
} from '../controllers/notificationsControllers.js';

const router = Router();

router.get('/', protect, getNotifications);
router.patch('/read-all', protect, allNotificationsRead);
router.patch('/:notificationId/read', protect, notificationRead);

export default router;
