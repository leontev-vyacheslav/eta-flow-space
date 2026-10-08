import { ConfigModel } from '../models/configs/config.model';

// A missing JWT secret must stop the app: a built-in fallback would let anyone forge tokens.
const requireEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set`);
    }
    return value;
};

export const configuration = (): ConfigModel => ({
    database: {
        username: process.env.DB_USERNAME || 'postgres',
        password: requireEnv('DB_PASSWORD'),
        database: process.env.DB_DATABASE || 'eta_flow_space_database',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '35432', 10),
        dialect: (process.env.DB_DIALECT || 'postgres') as ConfigModel['database']['dialect'],
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
    },
    jwt: {
        secret: requireEnv('JWT_SECRET'),
        refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        algorithm: (process.env.JWT_ALGORITHM || 'HS256') as ConfigModel['jwt']['algorithm'],
    },
    app: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3002', 10),
        staticsPath: process.env.STATICS_PATH || '',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
});
