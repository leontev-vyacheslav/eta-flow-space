import { parse } from 'acorn';
import type { Node } from 'acorn';

// Runs the data-state-eval expressions of the mnemoschema SVGs without eval.
// They are parsed once and interpreted with a small allowlist, which covers what the SVGs use, e.g.
//   element.style.display = ([2, 3, 4].includes(value) ? 'initial' : 'none');
//   if (states['spring-boiler-room'].isConnected === false) { element.style.fill = 'red' }
//   element.innerHTML = `(ΔP ≤ ${states['amirkhana99-hws-node'].limDeltaPressTOA}) м`;
// Anything else (function calls other than [...].includes, globals, other assignments) is rejected,
// so an SVG can colour and label its own elements but cannot run code.

export type StateExpressionScope = {
    element: Element;
    states: Record<string, any>;
    // absent for elements bound to several states (data-state with ';')
    value?: any;
};

// style properties an expression may set; extend when a mnemoschema needs another one
const ALLOWED_STYLE_PROPERTIES = new Set([
    'fill', 'stroke', 'strokeWidth', 'strokeDasharray', 'display', 'visibility',
    'opacity', 'fillOpacity', 'strokeOpacity', 'color',
]);
const FORBIDDEN_MEMBERS = new Set(['__proto__', 'prototype', 'constructor']);

class StateExpressionError extends Error { }

type AnyNode = Node & Record<string, any>;

const compiled = new Map<string, AnyNode | StateExpressionError>();

function compile(source: string): AnyNode {
    let program = compiled.get(source);
    if (!program) {
        try {
            program = parse(source, { ecmaVersion: 2020 }) as AnyNode;
            validate(program);
        } catch (error) {
            program = error instanceof StateExpressionError ? error : new StateExpressionError(`cannot parse: ${(error as Error).message}`);
        }
        compiled.set(source, program);
    }
    if (program instanceof StateExpressionError) {
        throw program;
    }

    return program;
}

// checked once at compile time, so a rejected expression never runs even partially
function validate(node: AnyNode): void {
    switch (node.type) {
        case 'Program':
        case 'BlockStatement':
            node.body.forEach(validate);
            return;
        case 'EmptyStatement':
            return;
        case 'ExpressionStatement':
            validate(node.expression);
            return;
        case 'IfStatement':
            validate(node.test);
            validate(node.consequent);
            if (node.alternate) validate(node.alternate);
            return;
        case 'AssignmentExpression':
            if (node.operator !== '=') throw new StateExpressionError(`operator ${node.operator} is not allowed`);
            assignmentTarget(node.left);
            validate(node.right);
            return;
        case 'TemplateLiteral':
            node.expressions.forEach(validate);
            return;
        case 'ConditionalExpression':
            validate(node.test);
            validate(node.consequent);
            validate(node.alternate);
            return;
        case 'LogicalExpression':
        case 'BinaryExpression':
            if (!evaluateBinary.has(node.operator)) throw new StateExpressionError(`operator ${node.operator} is not allowed`);
            validate(node.left);
            validate(node.right);
            return;
        case 'UnaryExpression':
            if (!['!', '-', '+'].includes(node.operator)) throw new StateExpressionError(`operator ${node.operator} is not allowed`);
            validate(node.argument);
            return;
        case 'Literal':
            if (node.regex || typeof node.value === 'bigint') throw new StateExpressionError('regular expression and bigint literals are not allowed');
            return;
        case 'Identifier':
            if (!['value', 'states', 'undefined'].includes(node.name)) throw new StateExpressionError(`identifier ${node.name} is not allowed`);
            return;
        case 'ArrayExpression':
            node.elements.forEach((e: AnyNode | null) => {
                if (!e || e.type === 'SpreadElement') throw new StateExpressionError('holes and spread in arrays are not allowed');
                validate(e);
            });
            return;
        case 'ChainExpression':
            validate(node.expression);
            return;
        case 'MemberExpression':
            validate(node.object);
            if (node.computed) validate(node.property);
            else if (FORBIDDEN_MEMBERS.has(node.property.name)) throw new StateExpressionError(`member ${node.property.name} is not allowed`);
            return;
        case 'CallExpression':
            // only <array>.includes(<one argument>)
            if (node.callee.type !== 'MemberExpression' || node.callee.computed || node.callee.property.name !== 'includes' || node.arguments.length !== 1) {
                throw new StateExpressionError('only [...].includes(x) calls are allowed');
            }
            validate(node.callee.object);
            validate(node.arguments[0]);
            return;
        default:
            throw new StateExpressionError(`${node.type} is not allowed`);
    }
}

type AssignmentTarget = { kind: 'style'; property: string } | { kind: 'text' };

// the only assignable targets: element.style.<allowed property>, and element.innerHTML / element.textContent,
// which are both written as plain text so a state value can never inject markup
function assignmentTarget(node: AnyNode): AssignmentTarget {
    const isElementMember = (n: AnyNode) => n.type === 'MemberExpression' && !n.computed
        && n.object.type === 'Identifier' && n.object.name === 'element';

    if (isElementMember(node) && ['innerHTML', 'textContent'].includes(node.property.name)) {
        return { kind: 'text' };
    }
    if (node.type === 'MemberExpression' && !node.computed && isElementMember(node.object) && node.object.property.name === 'style') {
        if (!ALLOWED_STYLE_PROPERTIES.has(node.property.name)) throw new StateExpressionError(`style property ${node.property.name} is not allowed`);
        return { kind: 'style', property: node.property.name };
    }
    throw new StateExpressionError('only element.style.<property>, element.innerHTML and element.textContent can be assigned');
}

const evaluateBinary = new Map<string, (a: any, b: any) => any>([
    ['===', (a, b) => a === b], ['!==', (a, b) => a !== b],
    ['==', (a, b) => a == b], ['!=', (a, b) => a != b],
    ['<', (a, b) => a < b], ['<=', (a, b) => a <= b], ['>', (a, b) => a > b], ['>=', (a, b) => a >= b],
    ['+', (a, b) => a + b], ['-', (a, b) => a - b], ['*', (a, b) => a * b], ['/', (a, b) => a / b], ['%', (a, b) => a % b],
    // logical operators are evaluated lazily in evaluate(); listed here so validate() accepts them
    ['&&', () => undefined], ['||', () => undefined], ['??', () => undefined],
]);

// thrown for a?.b on a null/undefined object: ends the whole optional chain with undefined
const shortCircuit = Symbol('shortCircuit');

function readMember(object: any, key: any): any {
    if (object === null || object === undefined) {
        // same failure as JavaScript, so a missing device state behaves as it did with eval
        throw new TypeError(`Cannot read properties of ${object} (reading '${String(key)}')`);
    }
    if (typeof key !== 'string' && typeof key !== 'number') throw new StateExpressionError('member name must be a string or a number');
    if (FORBIDDEN_MEMBERS.has(String(key))) throw new StateExpressionError(`member ${String(key)} is not allowed`);
    if (Array.isArray(object) && key === 'length') return object.length;
    // own data only: no inherited methods or prototype properties
    return Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined;
}

function evaluate(node: AnyNode, scope: StateExpressionScope): any {
    switch (node.type) {
        case 'Program':
        case 'BlockStatement':
            node.body.forEach((statement: AnyNode) => evaluate(statement, scope));
            return undefined;
        case 'EmptyStatement':
            return undefined;
        case 'ExpressionStatement':
            return evaluate(node.expression, scope);
        case 'IfStatement':
            if (evaluate(node.test, scope)) evaluate(node.consequent, scope);
            else if (node.alternate) evaluate(node.alternate, scope);
            return undefined;
        case 'AssignmentExpression': {
            const target = assignmentTarget(node.left);
            const result = evaluate(node.right, scope);
            if (target.kind === 'text') {
                scope.element.textContent = String(result);
            } else {
                ((scope.element as SVGElement).style as unknown as Record<string, unknown>)[target.property] = result;
            }
            return result;
        }
        case 'TemplateLiteral':
            return node.quasis.map((quasi: AnyNode, i: number) =>
                quasi.value.cooked + (i < node.expressions.length ? String(evaluate(node.expressions[i], scope)) : '')).join('');
        case 'ConditionalExpression':
            return evaluate(node.test, scope) ? evaluate(node.consequent, scope) : evaluate(node.alternate, scope);
        case 'LogicalExpression': {
            const left = evaluate(node.left, scope);
            if (node.operator === '&&') return left && evaluate(node.right, scope);
            if (node.operator === '||') return left || evaluate(node.right, scope);
            return left ?? evaluate(node.right, scope);
        }
        case 'BinaryExpression':
            return evaluateBinary.get(node.operator)!(evaluate(node.left, scope), evaluate(node.right, scope));
        case 'UnaryExpression': {
            const argument = evaluate(node.argument, scope);
            return node.operator === '!' ? !argument : node.operator === '-' ? -argument : +argument;
        }
        case 'Literal':
            return node.value;
        case 'Identifier':
            if (node.name === 'undefined') return undefined;
            if (!(node.name in scope)) throw new ReferenceError(`${node.name} is not defined`);
            return scope[node.name as 'value' | 'states'];
        case 'ArrayExpression':
            return node.elements.map((e: AnyNode) => evaluate(e, scope));
        case 'ChainExpression':
            try {
                return evaluate(node.expression, scope);
            } catch (error) {
                if (error === shortCircuit) return undefined;
                throw error;
            }
        case 'MemberExpression': {
            const object = evaluate(node.object, scope);
            if (node.optional && (object === null || object === undefined)) throw shortCircuit;
            return readMember(object, node.computed ? evaluate(node.property, scope) : node.property.name);
        }
        case 'CallExpression': {
            const array = evaluate(node.callee.object, scope);
            if (!Array.isArray(array)) throw new StateExpressionError('includes() is only allowed on arrays');
            return array.includes(evaluate(node.arguments[0], scope));
        }
        default:
            throw new StateExpressionError(`${node.type} is not allowed`);
    }
}

export function evaluateState(source: string, scope: StateExpressionScope): void {
    evaluate(compile(source), scope);
}
