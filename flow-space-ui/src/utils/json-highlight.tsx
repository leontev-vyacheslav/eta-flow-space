import type { ReactNode } from 'react';

// keys, strings, numbers, booleans and null of JSON.stringify output
const jsonTokenRegex = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

// formatted JSON as text with coloured tokens (plain spans, so it renders fast and stays searchable)
export function highlightJson(json: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;

    for (const match of json.matchAll(jsonTokenRegex)) {
        if (match.index > lastIndex) {
            nodes.push(json.slice(lastIndex, match.index));
        }

        const [token, stringToken, colon, booleanToken] = match;
        const className = stringToken
            ? (colon ? 'json-key' : 'json-string')
            : booleanToken ? 'json-boolean'
                : token === 'null' ? 'json-null'
                    : 'json-number';

        nodes.push(<span key={match.index} className={className}>{stringToken ?? token}</span>);
        if (colon) {
            nodes.push(colon);
        }
        lastIndex = match.index + token.length;
    }

    if (lastIndex < json.length) {
        nodes.push(json.slice(lastIndex));
    }

    return nodes;
}
