import { Injectable, Logger } from '@nestjs/common';
import { validateAst } from './ast-validator';

type ExpressionContext = Record<string, any>;

type AsyncFunctionConstructor = new (...args: string[]) => (...params: any[]) => Promise<any>;

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
const AsyncFunction: AsyncFunctionConstructor = Object.getPrototypeOf(async function () {}).constructor;

@Injectable()
export class ExpressionEvaluatorService {
    private readonly logger = new Logger(ExpressionEvaluatorService.name);

    async evaluateExpression(expression: string, context: ExpressionContext): Promise<boolean> {
        const value = await this.evaluateRaw(expression, context);
        return Boolean(value);
    }

    async evaluateDescription(description: string, context: ExpressionContext): Promise<string> {
        if (!description.includes('${')) {
            return description;
        }

        const template = description.replace(/^`|`$/g, '');
        const regex = /\$\{([^}]+)\}/g;
        let result = '';
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(template)) !== null) {
            result += template.slice(lastIndex, match.index);
            const inner = match[1].trim();
            try {
                const value = await this.evaluateRaw(inner, context);
                result += String(value);
            } catch (error) {
                this.logger.error(`Failed to evaluate template expression "${inner}"`, error);
                result += match[0];
            }
            lastIndex = match.index + match[0].length;
        }

        result += template.slice(lastIndex);
        return result;
    }

    private async evaluateRaw(expression: string, context: ExpressionContext): Promise<unknown> {
        validateAst(expression);

        const argNames = Object.keys(context);
        const argValues: unknown[] = Object.values(context);
        const fn = new AsyncFunction(...argNames, `return (${expression})`);
        return await fn(...argValues);
    }
}
