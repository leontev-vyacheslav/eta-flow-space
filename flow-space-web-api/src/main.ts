import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS with minimal configuration
    app.enableCors({
        origin: process.env.CORS_ORIGIN || '*', // Allow all origins by default, can be restricted via environment variable
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow common HTTP methods
        allowedHeaders: 'Content-Type, Authorization', // Allow common headers
    });

    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
