import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/authRoutes.js';
import sessionsRoutes from './routes/sessionsRoutes.js';
import friendsRoutes from './routes/friendsRoutes.js';
import ratingsRoutes from './routes/ratingsRoutes.js';

const port = process.env.PORT || 9090;

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/friends', friendsRoutes);
app.use('/ratings', ratingsRoutes);

app.listen(port, () => {
    console.log(`Server listen http://localhost/${port}`);
});
