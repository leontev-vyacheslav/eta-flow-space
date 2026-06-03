import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class ParseFieldsPipe implements PipeTransform {
    constructor(private readonly i18n: I18nService) {}

    private readonly VALID_FIELDS = /^[a-zA-Z0-9_;.[\]]+$/;

    transform(value: unknown): string[] | undefined {
        if (value === undefined || value === null) return undefined;
        if (typeof value !== 'string' || !this.VALID_FIELDS.test(value)) {
            throw new BadRequestException(this.i18n.t('errors.INVALID_QUERY_PARAMETER'));
        }
        return value.split(';');
    }
}
