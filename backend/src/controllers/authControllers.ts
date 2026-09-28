import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import z from 'zod';

import { errorHandler, errorZod } from '../utils/errorHandler.js';
import { isPostgresError } from '../utils/isPostgresError.js';
import { query } from '../config/bd.js';
import { env } from '../config/env.js';
import { registerSchema, loginSchema } from '../schema/auth.schema.js';

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = registerSchema.parse(req.body);

        const userExist = await query('SELECT name FROM users WHERE email = $1', [data.email]);

        if ((userExist.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'The user already exists' });
            return;
        }

        const password_hash = await bcrypt.hash(data.password, 10);

        const sql = `
            INSERT INTO users (name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING name, email
        `;

        const user = await query(sql, [data.name, data.email, password_hash]);

        res.status(201).json({
            message: 'The user has been successfully registered',
            user: user.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        if (
            isPostgresError(error) &&
            error.code === '23505' &&
            error.constraint === 'unique_user_email'
        ) {
            res.status(409).json({ message: 'The user already exists' });
            return;
        }

        errorHandler(res, 'Error during user registration', error);
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = loginSchema.parse(req.body);

        const userExist = await query('SELECT id, password_hash FROM users WHERE email = $1', [
            data.email,
        ]);

        if ((userExist.rowCount ?? 0) === 0) {
            res.status(401).json({ message: 'Email or password incorrect' });
            return;
        }

        const isMatch = await bcrypt.compare(data.password, userExist.rows[0].password_hash);

        if (!isMatch) {
            res.status(401).json({ message: 'Email or password incorrect' });
            return;
        }

        const token = jwt.sign({ userId: userExist.rows[0].id }, env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.status(200).json({
            message: 'The user has successfully logged in',
            token: token,
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        errorHandler(res, 'Error during user login attempt', error);
    }
};

export const getMyInfo = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    try {
        if (!userId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const user = await query('SELECT id, name, email FROM users WHERE id = $1', [userId]);

        if (user.rowCount === 0) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.status(200).json({
            user: user.rows[0],
        });
    } catch (error) {
        errorHandler(res, 'Error retrieving user information', error);
    }
};
