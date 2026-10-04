import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { join } from 'path/win32';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: ['log', 'error', 'warn'],
    });

    app.use(helmet({ hsts: false }));

    app.use(
        '/static',
        helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
        }),
    );

    app.use(cookieParser());

    // Production is same-origin behind the gateway; only the dev UI (localhost:3000 -> API on :3002) is cross-origin
    app.enableCors({
        origin: ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: 'Authorization,content-type',
    });

    app.useGlobalPipes(new I18nValidationPipe());
    app.useGlobalFilters(new I18nValidationExceptionFilter());

    // main.ts
    if (process.env.NODE_ENV !== 'production') {
        app.useStaticAssets(process.env.STATICS_PATH ?? join(__dirname, 'statics'), {
            prefix: '/static',
        });
    }

    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
