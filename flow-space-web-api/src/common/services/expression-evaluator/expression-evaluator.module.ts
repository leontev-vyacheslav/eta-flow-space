import { Module } from '@nestjs/common';
import { ExpressionEvaluatorService } from './expression-evaluator.service';

@Module({
    providers: [ExpressionEvaluatorService],
    exports: [ExpressionEvaluatorService],
})
export class ExpressionEvaluatorModule {}
