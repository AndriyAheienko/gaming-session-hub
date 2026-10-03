import { Router } from 'express';
import { searchGames } from '../controllers/gamesControllers.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', protect, searchGames);

export default router;
