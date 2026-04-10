export interface DatabaseConfig {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
    dialect: 'postgres' | 'mysql' | 'sqlite' | 'mssql';
    logging: boolean | ((sql: string, timing?: number) => void);
}

export interface JwtConfig {
    secret: string;
    expiresIn: string;
    algorithm: 'HS256' | 'HS384' | 'HS512';
}

export interface AppConfig {
    nodeEnv: string;
    port: number;
}

export interface Config {
    database: DatabaseConfig;
    jwt: JwtConfig;
    app: AppConfig;
}
