export interface JwtConfigModel {
    secret: string;
    expiresIn: string;
    algorithm: 'HS256' | 'HS384' | 'HS512';
}
