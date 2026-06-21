export interface JwtPayloadModel {
    userId: number;
    roleId: number;
    type: 'access' | 'refresh';
}
