import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { errorHandler } from '../utils/errorHandler.js';
import query from '../config/bd.js';

export const register = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password } = req.body;

    try {
        const userExist = await query('SELECT name FROM users WHERE email = $1', [email]);

        if ((userExist.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'The user already exists' });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING name, email
        `;

        const user = await query(sql, [name, email, password_hash]);

        res.status(201).json({
            message: 'The user has been successfully registered',
            user: user.rows[0],
        });
    } catch (error) {
        errorHandler(res, 'Error during user registration', error);
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    try {
        const userExist = await query('SELECT id, password_hash FROM users WHERE email = $1', [
            email,
        ]);

        if ((userExist.rowCount ?? 0) === 0) {
            res.status(401).json({ message: 'Email or password incorrect' });
            return;
        }

        const isMatch = await bcrypt.compare(password, userExist.rows[0].password_hash);

        if (!isMatch) {
            res.status(401).json({ message: 'Email or password incorrect' });
            return;
        }

        const token = jwt.sign({ userId: userExist.rows[0].id }, process.env.JWT_SECRET as string, {
            expiresIn: '1d',
        });

        res.status(200).json({
            message: 'The user has been successfully login',
            token: token,
        });
    } catch (error) {
        errorHandler(res, 'Error during user login attempt', error);
    }
};

export const getMyInfo = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    try {
        const user = await query('SELECT id, name, email FROM users WHERE id = $1', [userId]);

        if (user.rowCount === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.status(200).json({
            user: user.rows[0],
        });
    } catch (error) {
        errorHandler(res, 'Error during get info about user', error);
    }
};
