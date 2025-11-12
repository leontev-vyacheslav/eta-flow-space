const isoDateFormat = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{1,5})?(Z|([+-]([01]\d|2[0-3]):[0-5]\d))?/;

function isIsoDateString(value: any): boolean {
  return value && typeof value === 'string' && isoDateFormat.test(value);
}

function toDate(value: string) {
  return  new Date(value.includes('+') || value.includes('Z') ? value : `${value}Z`)
}

export function handleDates(obj: any) {

  if (obj === null || obj === undefined || typeof obj !== 'object')
    return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if(typeof obj[i] === 'string' && isIsoDateString(obj[i])) {
        obj[i] = toDate(obj[i])
      } else  {
        handleDates(obj[i]);
      }
    }
  } else {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (isIsoDateString(value)) {
        obj[key] = toDate(value);
      }
      else if (typeof value === 'object') {
        handleDates(value);
      }
    }
  }
}