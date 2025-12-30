export function getKeyValuePairs(data: any): { key: string, value: any }[] {
    const dataStateAttrNames: { key: string, value: any }[] = [];

    const collectKeyValuePairs = (data: any, s: string = "") => {
        Object.keys(data).forEach(k => {
            const value = data[k];
            if (Array.isArray(value)) {
                value.forEach((_, i) => {
                    const vv = value[i];
                    if (typeof vv === 'object' && vv !== null) {
                        collectKeyValuePairs(vv, `${k}[${i}].`);
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                collectKeyValuePairs(value, `${k}.`);
            } else {
                dataStateAttrNames.push({ key: `${s}${k}`, value: value });
            }
        });
    };

    collectKeyValuePairs(data);

    return dataStateAttrNames;
}

export const getSchemaTypeInfo = (chain: string, subschema: any, schema?: any): { typeName: string, unit: string | undefined } | undefined => {
    // eslint-disable-next-line prefer-const
    let [propName, ...restProps] = chain.split('.');
    const restChain = restProps.join('.');
    propName = propName.split('[')[0];
    const prop = subschema.properties[propName];
    if (prop) {
        schema = schema || subschema;
        if (['number', 'integer', 'string'].includes(prop.type)) {
            return { typeName: prop.type, unit: prop.unit };
        } else if (prop.type === 'array') {
            const typeRef = prop.items.$ref;
            if (typeRef) {
                const typeName = typeRef.split("/").pop();
                const objectSchema = schema.$defs[typeName];
                if (restChain) {
                    return getSchemaTypeInfo(restChain, objectSchema, schema)
                }
            } else {
                return { typeName: prop.items.type, unit: prop.items.unit };
            }
        } else if (!prop.type && prop.$ref) {
            const typeRef = prop.$ref;
            const typeName = typeRef.split("/").pop();
            const objectSchema = schema.$defs[typeName];
            if (restChain) {
                return getSchemaTypeInfo(restChain, objectSchema, schema)
            } else {
                return { typeName: typeName, unit: prop.unit };
            }
        }
    }
};
