import { DataSchemasService } from '../data-schemas/data-schemas.service';

export type RuleHelpers = Readonly<{
    getEnumDescription: (deviceCode: string, typeName: string, value: number) => Promise<string>;
    formatNumber: (value: number) => string;
}>;

// What alarm rules get as `dss`: only the two functions they use. With the whole service, a rule description
// could read the service's configuration, secrets included. Frozen and without a prototype, so a rule can
// neither change it nor reach anything through it.
export function createRuleHelpers(dataSchemas: DataSchemasService): RuleHelpers {
    const helpers = Object.create(null) as Record<string, unknown>;
    helpers.getEnumDescription = (deviceCode: string, typeName: string, value: number) => dataSchemas.getEnumDescription(deviceCode, typeName, value);
    helpers.formatNumber = (value: number) => dataSchemas.formatNumber(value);

    return Object.freeze(helpers) as RuleHelpers;
}
