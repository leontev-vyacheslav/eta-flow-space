import { BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ParseFieldsPipe } from './parse-state-fields.pipe';

describe('ParseFieldsPipe', () => {
    const pipe = new ParseFieldsPipe({ t: (key: string) => key } as unknown as I18nService);

    it('splits the field list', () => {
        expect(pipe.transform('t;pumps[0].alarm')).toEqual(['t', 'pumps[0].alarm']);
    });

    it('refuses a missing field list (was a 500)', () => {
        expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
        expect(() => pipe.transform(null)).toThrow(BadRequestException);
    });

    it('refuses anything outside the field syntax', () => {
        expect(() => pipe.transform("t' OR 1=1")).toThrow(BadRequestException);
        expect(() => pipe.transform('')).toThrow(BadRequestException);
    });
});
