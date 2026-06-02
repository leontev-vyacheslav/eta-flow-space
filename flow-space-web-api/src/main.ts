import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['log', 'error', 'warn'],
    });

    app.enableCors({
        origin: '*',
        methods: '*',
        allowedHeaders: 'Authorization,content-type,x-requested-user',
    });

    app.useGlobalPipes(new I18nValidationPipe());
    app.useGlobalFilters(new I18nValidationExceptionFilter());

    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
