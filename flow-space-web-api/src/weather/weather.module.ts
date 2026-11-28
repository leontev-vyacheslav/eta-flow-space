import { Module } from '@nestjs/common';
import { WeatherForecastModule } from '../common/services/weather-forecast/weather-forecast.module';
import { WeatherController } from './weather.controller';

@Module({
    imports: [WeatherForecastModule],
    controllers: [WeatherController],
})
export class WeatherModule {}
