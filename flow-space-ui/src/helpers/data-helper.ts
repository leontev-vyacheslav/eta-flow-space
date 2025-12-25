export function getKeyValuePairs(data: any): {key: string, value: any}[] {
    const dataStateAttrNames: {key: string, value: any}[] = [];

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