import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['log', 'error', 'warn'],
    });

    app.enableCors({
        origin: '*',
        methods: '*',
        allowedHeaders: 'Authorization,content-type,x-requested-user',
    });

    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
