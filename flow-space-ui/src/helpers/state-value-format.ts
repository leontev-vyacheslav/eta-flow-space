import AppConstants from '../constants/app-constants';
import type { SchemaTypeInfoModel } from './data-helper';

export type DateTimeFormatMode = 'date' | 'time' | 'datetime' | string | null | undefined;

// "<code> - <description>" in the schema; returns the description part, undefined for an unknown value
export function getEnumDescription(dataschema: any, typeName: string, value: any): string | undefined {
    const enumDescription = dataschema?.$defs?.[typeName]?.enumDescriptions?.[value];

    return typeof enumDescription === 'string' ? enumDescription.split(' - ').pop() : undefined;
}

export function formatNumber(value: any, typeInfo: SchemaTypeInfoModel | undefined): string {
    if (typeInfo?.formatting && typeInfo.formatting.options) {
        return new Intl.NumberFormat(
            typeInfo.formatting.locale ?? AppConstants.formatting.numberFormat.locale,
            typeInfo.formatting.options
        ).format(value);
    }

    return new Intl.NumberFormat(
        AppConstants.formatting.numberFormat.locale,
        AppConstants.formatting.numberFormat.options as Intl.NumberFormatOptions
    ).format(value);
}

export function isDateTime(typeInfo: SchemaTypeInfoModel | undefined): boolean {
    return typeInfo?.ui?.editor?.editorOptions?.type === 'datetime';
}

// mode comes from the mnemoschema's data-state-format attribute: 'date', 'time', anything else is date and time
export function formatDateTime(value: any, mode?: DateTimeFormatMode): string {
    const date = new Date(value);

    if (mode === 'date') {
        return date.toLocaleDateString('ru-RU');
    }
    if (mode === 'time') {
        return date.toLocaleTimeString('ru-RU');
    }

    return date.toLocaleString('ru-RU');
}
