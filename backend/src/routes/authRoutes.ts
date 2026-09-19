import { Router } from 'express';
import { login, register, getMyInfo } from '../controllers/authControllers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/me', protect, getMyInfo);
router.post('/register', register);
router.post('/login', login);

export default router;
