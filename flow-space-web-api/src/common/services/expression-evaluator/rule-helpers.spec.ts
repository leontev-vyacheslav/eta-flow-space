import { ExpressionEvaluatorService } from './expression-evaluator.service';
import { createRuleHelpers } from './rule-helpers';
import { DataSchemasService } from '../data-schemas/data-schemas.service';

describe('createRuleHelpers', () => {
    const evaluator = new ExpressionEvaluatorService();
    // a stand-in for the real service, with a configuration that holds a secret
    const dataSchemas = {
        configService: { internalConfig: { jwt: { secret: 'TOP-SECRET' } } },
        getEnumDescription: jest.fn().mockResolvedValue('Авария'),
        formatNumber: jest.fn().mockReturnValue('70,5'),
    } as unknown as DataSchemasService;
    const context = { state: { t: 70.456, alarm: 2 }, dss: createRuleHelpers(dataSchemas), deviceCode: 'spring' };

    it('passes the two rule functions through to the service', async () => {
        const text = await evaluator.evaluateDescription(
            "`Насос: ${await dss.getEnumDescription(deviceCode, 'NetworkPumpAlarm', state.alarm)}, ${dss.formatNumber(state.t)} °C`",
            context,
        );

        expect(text).toBe('Насос: Авария, 70,5 °C');
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(dataSchemas.getEnumDescription).toHaveBeenCalledWith('spring', 'NetworkPumpAlarm', 2);
    });

    it('gives a description no way to read the service configuration', async () => {
        for (const description of [
            '`${dss.configService.internalConfig.jwt.secret}`',
            "`${dss['configService']}`",
            '`${dss.constructor}`',
            '`${dss.__proto__}`',
        ]) {
            expect(await evaluator.evaluateDescription(description, context)).not.toContain('TOP-SECRET');
        }
    });

    it('is frozen and has no prototype', () => {
        expect(Object.isFrozen(context.dss)).toBe(true);
        expect(Object.getPrototypeOf(context.dss)).toBeNull();
        expect(Object.keys(context.dss).sort()).toEqual(['formatNumber', 'getEnumDescription']);
    });
});
