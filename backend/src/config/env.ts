import 'dotenv/config';
import { envSchema } from '../schema/env.schema.js';

const parsedEnv = envSchema.parse(process.env);

export const env = {
    DATABASE_URL: parsedEnv.DATABASE_URL,
    JWT_SECRET: parsedEnv.JWT_SECRET,
    PORT: parsedEnv.PORT,
    NODE_ENV: parsedEnv.NODE_ENV,
    CORS_ORIGIN: parsedEnv.CORS_ORIGIN,
    RAWG_API_KEY: parsedEnv.RAWG_API_KEY,
};
