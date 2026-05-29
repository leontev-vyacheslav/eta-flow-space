// logger.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { STATUS_CODES } from 'http';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private logger = new Logger('HTTP');

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl } = req;
        const start = Date.now();

        res.on('finish', () => {
            const duration = `\x1b[33m+${Date.now() - start}ms\x1b[0m`;
            this.logger.log(`${method} ${originalUrl} ${res.statusCode} ${(STATUS_CODES[res.statusCode] || '').trim()} ${duration}`);
        });

        next();
    }
}
