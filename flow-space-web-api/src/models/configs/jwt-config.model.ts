export interface JwtConfigModel {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: 'HS256' | 'HS384' | 'HS512';
}
