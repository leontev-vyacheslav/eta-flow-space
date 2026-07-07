import * as acorn from 'acorn';

const BLOCKED_IDENTIFIERS = new Set(['process', 'require', 'global', 'module', 'eval', 'Function', 'this', 'console']);

const ALLOWED_CALLEE_OBJECTS = new Set(['dss']);
const ALLOWED_MEMBER_OBJECTS = new Set(['state', 'dss', 'flowCode']);

const ALLOWED_DSS_METHODS = new Set(['getEnumDescription', 'formatNumber']);

export function validateAst(expression: string): void {
    const ast = acorn.parse(expression, {
        ecmaVersion: 2022,
        sourceType: 'module',
        allowAwaitOutsideFunction: true,
    });

    for (const node of ast.body) {
        if (node.type === 'ExpressionStatement') {
            validateNode(node.expression);
        }
    }
}

type AstNode = { type: string; [key: string]: any };

function validateNode(node: AstNode): void {
    if (!node || typeof node !== 'object' || !node.type) {
        return;
    }

    switch (node.type) {
        case 'AssignmentExpression':
        case 'AssignmentPattern':
        case 'UpdateExpression':
            throw new Error(`Forbidden: ${node.type}`);

        case 'NewExpression':
            throw new Error('Forbidden: NewExpression');

        case 'ImportExpression':
            throw new Error('Forbidden: ImportExpression');

        case 'ArrowFunctionExpression':
        case 'FunctionExpression':
            throw new Error('Forbidden: nested function expression');

        case 'Identifier':
            if (BLOCKED_IDENTIFIERS.has(node.name as string)) {
                throw new Error(`Forbidden identifier: ${node.name as string}`);
            }
            break;

        case 'CallExpression': {
            const callee = node.callee as AstNode;
            if (
                callee.type !== 'MemberExpression' ||
                (callee.object as AstNode).type !== 'Identifier' ||
                !ALLOWED_CALLEE_OBJECTS.has((callee.object as AstNode).name as string)
            ) {
                throw new Error('Forbidden: CallExpression on non-whitelisted object');
            }
            const prop = callee.property as AstNode;
            if (prop.type === 'Identifier' && !ALLOWED_DSS_METHODS.has(prop.name as string)) {
                throw new Error(`Forbidden: dss.${prop.name as string} is not allowed`);
            }
            for (const arg of node.arguments as AstNode[]) {
                validateNode(arg);
            }
            break;
        }

        case 'MemberExpression': {
            // Walk up the chain to find the root Identifier
            let current = node.object as AstNode;
            while (current.type === 'MemberExpression') {
                current = current.object as AstNode;
            }
            if (current.type !== 'Identifier' || !ALLOWED_MEMBER_OBJECTS.has(current.name as string)) {
                throw new Error('Forbidden: MemberExpression on non-whitelisted object');
            }
            // Validate property (e.g. .foo or [expr])
            validateNode(node.property as AstNode);
            break;
        }

        case 'BinaryExpression':
        case 'LogicalExpression':
        case 'UnaryExpression':
        case 'ConditionalExpression':
        case 'SequenceExpression':
            for (const key of Object.keys(node)) {
                const val: unknown = node[key];
                if (val && typeof val === 'object') {
                    if (Array.isArray(val)) {
                        val.forEach((item: AstNode) => validateNode(item));
                    } else if ((val as AstNode).type) {
                        validateNode(val as AstNode);
                    }
                }
            }
            break;

        case 'TemplateLiteral':
            for (const expr of node.expressions as AstNode[]) {
                validateNode(expr);
            }
            break;

        case 'AwaitExpression':
            validateNode(node.argument as AstNode);
            break;

        case 'StringLiteral':
        case 'NumericLiteral':
        case 'BooleanLiteral':
        case 'NullLiteral':
        case 'Literal':
            break;

        default:
            throw new Error(`Forbidden node type: ${node.type}`);
    }
}
