import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/authRoutes.js';

const port = process.env.PORT || 9090;

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.listen(port, () => {
    console.log(`Server listen http://localhost/${port}`);
});
