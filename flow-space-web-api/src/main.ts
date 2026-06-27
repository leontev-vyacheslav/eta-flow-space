import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { join } from 'path/win32';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: ['log', 'error', 'warn'],
    });

    app.enableCors({
        origin: '*',
        methods: '*',
        allowedHeaders: 'Authorization,content-type,x-requested-user',
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
