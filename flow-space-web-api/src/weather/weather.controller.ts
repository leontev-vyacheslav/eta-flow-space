import { BadRequestException, Controller, Get, NotFoundException, ParseIntPipe, Query, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { RequestUserModel } from '../models/request-user.model';
import { WeatherForecastResponse } from '../models/weather-forecast.model';
import { WeatherForecastService } from '../common/services/weather-forecast/weather-forecast.service';

@Controller('api/weather')
@UseGuards(JwtAuthGuard)
export class WeatherController {
    constructor(
        private readonly forecasts: WeatherForecastService,
        private readonly i18n: I18nService,
    ) {}

    /** Returns the cached forecast for the boiler room's object location. */
    @Get('forecast')
    async getForecast(@User() user: RequestUserModel, @Query('objectLocationId', ParseIntPipe) objectLocationId: number): Promise<WeatherForecastResponse> {
        if (!Number.isSafeInteger(objectLocationId) || objectLocationId <= 0 || objectLocationId > 2_147_483_647) {
            throw new BadRequestException(this.i18n.t('errors.INVALID_QUERY_PARAMETER'));
        }
        const forecast = await this.forecasts.getForecast(user.userId, objectLocationId);
        if (forecast === undefined) {
            throw new NotFoundException(this.i18n.t('errors.WEATHER_OBJECT_LOCATION_NOT_FOUND'));
        }
        if (forecast === null) {
            throw new ServiceUnavailableException(this.i18n.t('errors.WEATHER_FORECAST_UNAVAILABLE'));
        }
        return forecast;
    }
}
