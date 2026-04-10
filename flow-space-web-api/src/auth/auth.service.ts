import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
    userId: number;
    roleId: number;
}

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) {}

    async signIn(payload: { login: string; userId: number; roleId: number }) {
        const jwtPayload: JwtPayload = {
            userId: payload.userId,
            roleId: payload.roleId,
        };
        return {
            token: await this.jwtService.signAsync(jwtPayload, {
                expiresIn: '24h',
            }),
            login: payload.login,
            role: payload.roleId,
        };
    }

    async verifyToken(token: string) {
        try {
            return await this.jwtService.verifyAsync<JwtPayload & object>(token);
        } catch {
            throw new UnauthorizedException('Токен авторизации неверный.');
        }
    }
}
