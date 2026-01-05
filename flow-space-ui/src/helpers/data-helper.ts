export type PropertiesChainValuePairModel = {
    propertiesChain: string;
    value: any;
    arrayIndex?: number;
}

export function getKeyValuePairs(data: any): PropertiesChainValuePairModel[] {
    const propertiesChainValuePairs: PropertiesChainValuePairModel[] = [];

    const collectKeyValuePairs = (data: any, s: string = '', arrayIndex?: number) => {
        Object.keys(data).forEach(k => {
            const value = data[k];
            if (Array.isArray(value)) {
                value.forEach((_, i) => {
                    const vv = value[i];
                    if (typeof vv === 'object' && vv !== null) {
                        collectKeyValuePairs(vv, `${k}[${i}].`, i);
                    }
                });
            } else if (typeof value === 'object' && value !== null) {
                collectKeyValuePairs(value, `${k}.`, arrayIndex);
            } else {
                propertiesChainValuePairs.push({ propertiesChain: `${s}${k}`, value: value, arrayIndex: arrayIndex });
            }
        });
    };

    collectKeyValuePairs(data);

    return propertiesChainValuePairs;
}

export type SchemaTypeInfoModel = {
    typeName: string,
    unit?: string;
    dimension?: number;
    ui?: any;
    isEnum?: boolean;
};

export const getSchemaTypeInfo = (propertiesChain: string, subschema: any, schema?: any): SchemaTypeInfoModel | undefined => {
    // eslint-disable-next-line prefer-const
    let [propName, ...restProps] = propertiesChain.split('.');
    const restChain = restProps.join('.');
    propName = propName.split('[')[0];
    const prop = subschema.properties[propName];
    if (prop) {
        schema = schema || subschema;
        if (['number', 'integer', 'string', 'boolean'].includes(prop.type)) {
            return { typeName: prop.type, unit: prop.unit, dimension: prop.dimension, ui: prop.ui };
        } else if (prop.type === 'array') {
            const typeRef = prop.items.$ref;
            if (typeRef) {
                const typeName = typeRef.split("/").pop();
                const objectSchema = schema.$defs[typeName];
                if (restChain) {
                    return getSchemaTypeInfo(restChain, objectSchema, schema)
                }
            } else {
                return {
                    typeName: prop.items.type,
                    unit: prop.items.unit,
                    dimension: prop.items.dimension
                };
            }
        } else if (!prop.type && prop.$ref) {
            const typeRef = prop.$ref;
            const typeName = typeRef.split("/").pop();
            const objectSchema = schema.$defs[typeName];
            if (restChain) {
                return getSchemaTypeInfo(restChain, objectSchema, schema)
            } else {
                const isEnum = !!schema.$defs[typeName] && !!schema.$defs[typeName].enum;
                return {
                    typeName: typeName,
                    unit: prop.unit,
                    dimension: prop.dimension,
                    ui: prop.ui,
                    isEnum: isEnum
                };
            }
        }
    }
};
