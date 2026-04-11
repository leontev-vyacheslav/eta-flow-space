import { Config } from './interfaces';

export const configuration = (): Config => ({
    database: {
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '0987654321',
        database: process.env.DB_DATABASE || 'eta_flow_space_database',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '35432', 10),
        dialect: (process.env.DB_DIALECT || 'postgres') as Config['database']['dialect'],
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        algorithm: (process.env.JWT_ALGORITHM || 'HS256') as Config['jwt']['algorithm'],
    },
    app: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3002', 10),
        staticPath: process.env.STATIC_PATH || '',
    },
});
