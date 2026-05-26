// logger.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;

    res.on('finish', () => {
      // logs AFTER the response is sent, so you get the status code too
      this.logger.log(`${method} ${originalUrl} → ${res.statusCode}`);
    });

    next();
  }
}