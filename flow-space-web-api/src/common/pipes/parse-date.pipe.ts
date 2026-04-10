import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transform(value: string, metadata: ArgumentMetadata): Date {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            throw new BadRequestException(`"${value}" is not a valid date`);
        }
        return date;
    }
}
