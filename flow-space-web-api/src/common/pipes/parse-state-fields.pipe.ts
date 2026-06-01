import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseFieldsPipe implements PipeTransform {
    private readonly VALID_FIELDS = /^[a-zA-Z0-9_;.\[\]]+$/;

    transform(value: unknown): string[] | undefined {
        if (value === undefined || value === null) return undefined;
        if (typeof value !== 'string' || !this.VALID_FIELDS.test(value)) {
            throw new BadRequestException('Указан неверный параметр в запросе');
        }
        return value.split(';');
    }
}
