import { Controller, Get, InternalServerErrorException, NotFoundException, Param, StreamableFile, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUserModel } from '../models/request-user.model';
import { User } from '../common/decorators/user.decorator';
import { join } from 'path';
import { promises as fs } from 'fs';
import { ConfigService } from '@nestjs/config/dist/config.service';

@Controller('api/quick-helps')
export class QuickHelpController {
    constructor(private readonly configService: ConfigService) {}

    @Get(':referenceKey')
    @UseGuards(JwtAuthGuard)
    async getQuickHelps(@User() user: RequestUserModel, @Param('referenceKey') referenceKeyEncoded: string) {
        const referenceKey = Buffer.from(referenceKeyEncoded, 'base64').toString('utf8');

        const staticPath = this.configService.get<string>('app.staticPath') ?? join(process.cwd(), 'static');
        const filePath = `${join(staticPath, '/quick-help/content', referenceKey)}.md`;

        try {
            await fs.access(filePath);
        } catch {
            throw new NotFoundException(`Элемент справочной системы ${referenceKey} не найден.`);
        }

        try {
            const content = await fs.readFile(filePath, { encoding: 'utf8' });
            return {
                key: referenceKey,
                content: content
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера.';
            throw new InternalServerErrorException(message);
        }
    }
}
