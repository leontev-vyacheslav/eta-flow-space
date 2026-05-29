export interface DatabaseConfigModel {
    username: string;
    password: string;
    database: string;
    host: string;
    port: number;
    dialect: 'postgres' | 'mysql' | 'sqlite' | 'mssql';
    logging: boolean | ((sql: string, timing?: number) => void);
}
