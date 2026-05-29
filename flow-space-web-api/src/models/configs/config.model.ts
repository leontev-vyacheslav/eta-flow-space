import { AppConfigModel } from './app-config.model';
import { DatabaseConfigModel } from './database-config.model';
import { JwtConfigModel } from './jwt-config.model';
import { RedisConfigModel } from './redis-config.model';

export interface ConfigModel {
    database: DatabaseConfigModel;
    jwt: JwtConfigModel;
    app: AppConfigModel;
    redis: RedisConfigModel;
}
