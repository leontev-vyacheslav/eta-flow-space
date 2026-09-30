import { Body, Controller, HttpCode, HttpStatus, INestApplication, Post, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AuthThrottlerGuard } from './auth-throttler.guard';

@Controller()
class TestController {
    @Post('sign-in')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthThrottlerGuard)
    signIn(@Body() body: unknown) {
        return body;
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthThrottlerGuard)
    refresh() {}

    @Post('other')
    @HttpCode(HttpStatus.OK)
    other() {}
}

describe('AuthThrottlerGuard', () => {
    let app: INestApplication<App>;

    const post = (path: string, ip: string, body: object = {}) => request(app.getHttpServer()).post(path).set('X-Real-IP', ip).send(body);

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: seconds(60), limit: 2 }] })],
            controllers: [TestController],
        }).compile();
        app = module.createNestApplication();
        await app.init();
    });

    afterEach(() => app.close());

    it('counts each client IP separately', async () => {
        await post('/refresh', '10.0.0.1').expect(200);
        await post('/refresh', '10.0.0.1').expect(200);
        await post('/refresh', '10.0.0.1').expect(429);
        await post('/refresh', '10.0.0.2').expect(200);
    });

    it('counts sign-in attempts per login within one IP', async () => {
        await post('/sign-in', '10.0.0.1', { login: 'alice' }).expect(200);
        await post('/sign-in', '10.0.0.1', { login: 'Alice' }).expect(200);
        await post('/sign-in', '10.0.0.1', { login: 'alice' }).expect(429);
        await post('/sign-in', '10.0.0.1', { login: 'bob' }).expect(200);
    });

    it('does not limit routes without the guard', async () => {
        for (let i = 0; i < 5; i++) {
            await post('/other', '10.0.0.1').expect(200);
        }
    });
});
