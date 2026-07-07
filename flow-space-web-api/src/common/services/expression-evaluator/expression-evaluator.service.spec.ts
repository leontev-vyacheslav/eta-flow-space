import { Test, TestingModule } from '@nestjs/testing';
import { ExpressionEvaluatorService } from './expression-evaluator.service';

describe('ExpressionEvaluatorService', () => {
    let service: ExpressionEvaluatorService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ExpressionEvaluatorService],
        }).compile();

        service = module.get<ExpressionEvaluatorService>(ExpressionEvaluatorService);
    });

    describe('evaluateExpression', () => {
        const context = {
            state: { temperature: 85, pressure: 120, isConnected: true, mode: 1 },
            dss: {
                getEnumDescription: jest.fn().mockResolvedValue('Heating'),
                formatNumber: jest.fn().mockReturnValue('85,0'),
            },
            flowCode: 'boiler-1',
        };

        it('should evaluate simple equality', async () => {
            const result = await service.evaluateExpression('state.isConnected === true', context);
            expect(result).toBe(true);
        });

        it('should evaluate comparison', async () => {
            const result = await service.evaluateExpression('state.temperature > 80', context);
            expect(result).toBe(true);
        });

        it('should evaluate false comparison', async () => {
            const result = await service.evaluateExpression('state.temperature > 100', context);
            expect(result).toBe(false);
        });

        it('should evaluate logical AND', async () => {
            const result = await service.evaluateExpression('state.temperature > 80 && state.pressure > 100', context);
            expect(result).toBe(true);
        });

        it('should evaluate negation', async () => {
            const result = await service.evaluateExpression('!state.isConnected', context);
            expect(result).toBe(false);
        });

        it('should evaluate async dss call', async () => {
            const result = await service.evaluateExpression('await dss.getEnumDescription(flowCode, "Mode", state.mode)', context);
            expect(result).toBe(true);
            expect(context.dss.getEnumDescription).toHaveBeenCalledWith('boiler-1', 'Mode', 1);
        });

        it('should throw on assignment', async () => {
            await expect(service.evaluateExpression('state.x = 5', context)).rejects.toThrow('Forbidden');
        });

        it('should throw on require', async () => {
            await expect(service.evaluateExpression('require("fs")', context)).rejects.toThrow('Forbidden');
        });

        it('should throw on process access', async () => {
            await expect(service.evaluateExpression('process.exit()', context)).rejects.toThrow('Forbidden');
        });

        it('should throw on eval', async () => {
            await expect(service.evaluateExpression('eval("hack")', context)).rejects.toThrow('Forbidden');
        });

        it('should throw on new expression', async () => {
            await expect(service.evaluateExpression('new Function("return 1")()', context)).rejects.toThrow('Forbidden');
        });

        it('should throw on update expression', async () => {
            await expect(service.evaluateExpression('state.temperature++', context)).rejects.toThrow('Forbidden');
        });

        it('should throw on import', async () => {
            await expect(service.evaluateExpression('import("fs")', context)).rejects.toThrow('Forbidden');
        });

        it('should throw on nested function', async () => {
            await expect(service.evaluateExpression('(() => 1)()', context)).rejects.toThrow('Forbidden');
        });
    });

    describe('evaluateDescription', () => {
        const context = {
            state: { temperature: 85 },
            dss: { getEnumDescription: jest.fn().mockResolvedValue('Heating'), formatNumber: jest.fn() },
            flowCode: 'boiler-1',
        };

        it('should return static text as-is', async () => {
            const result = await service.evaluateDescription('No interpolation here', context);
            expect(result).toBe('No interpolation here');
        });

        it('should interpolate state values', async () => {
            const result = await service.evaluateDescription('Temperature is ${state.temperature}°C', context);
            expect(result).toBe('Temperature is 85°C');
        });

        it('should handle backtick-wrapped descriptions', async () => {
            const result = await service.evaluateDescription('`Temp: ${state.temperature}`', context);
            expect(result).toBe('Temp: 85');
        });

        it('should handle multiple interpolations', async () => {
            const result = await service.evaluateDescription('${state.temperature} and ${state.temperature}', context);
            expect(result).toBe('85 and 85');
        });
    });
});
