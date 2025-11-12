
export function parseCustomJson(jsonString: string): any {
    try {
        return JSON.parse(jsonString, (key, value) => {
            if (value === 'Infinity') {
                return Infinity;
            } else if (value === '-Infinity') {
                return -Infinity;
            } else {
                return value;
            }
        });
    } catch {
        return null;
    }
}