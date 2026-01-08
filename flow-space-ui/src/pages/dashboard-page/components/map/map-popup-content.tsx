import { useCallback, useMemo } from "react";

import { useScreenSize } from "../../../../utils/media-query";
import { useDashboardPage } from "../../dashboard-page-context";
import { CheckedIcon, LocationIcon, UncheckedIcon } from "../../../../constants/app-icons";
import { type PropertiesChainValuePairModel, type SchemaTypeInfoModel, type SchemaTypeInfoPropertiesChainModel } from "../../../../helpers/data-helper";

export const MapPopupContent = () => {
    const { isXSmall } = useScreenSize();
    const { deviceState, dataschema, device, schemaTypeInfoPropertiesChain } = useDashboardPage();

    const renderStateValueByPropertiesChain = useCallback((typeInfo: SchemaTypeInfoModel, propertiesChain: PropertiesChainValuePairModel) => {
        const value = propertiesChain.value;

        if (typeInfo.typeName === 'boolean') {
            if (value === true) {
                return <CheckedIcon size={14} />
            }
            if (value === false) {
                return <UncheckedIcon size={14} />
            }
        }

        if (typeInfo.isEnum) {
            return dataschema.$defs[typeInfo.typeName].enumDescriptions[value].split(' - ').pop()
        }

        if ((typeInfo as any)["format"] !== 'date-time' && (['integer', 'float', 'number'].includes(typeInfo.typeName)) && value !== undefined) {
            if (typeInfo?.unit) {
                return `${value} ${typeInfo?.unit}`;
            }

            return value;
        }
        if ((typeInfo as any)["format"] === 'date-time' && value !== undefined) {
            if (typeInfo.typeName === 'integer') {
                return (new Date(value)).toLocaleString('ru-RU', {});
            } else if (typeInfo.typeName === 'string') {
                return (new Date(Date.parse(value))).toLocaleString('ru-RU', {});
            }
        }

        return 'Нет данных';

    }, [dataschema]);

    const controlDefinitions = useMemo(() => {
        if (dataschema && schemaTypeInfoPropertiesChain) {
            const groups = dataschema.ui?.groups;
            const groupped =
                schemaTypeInfoPropertiesChain
                    .reduce((acc, item) => {
                        const key = groups?.find((g: { id: number; }) => g.id === item.typeInfo!.ui.group)?.id || item.typeInfo!.ui.grop;
                        acc[key] = acc[key] || [];
                        acc[key].push(item);

                        return acc;
                    }, {} as Record<string, SchemaTypeInfoPropertiesChainModel[]>)
            return groupped;
        }
    }, [dataschema, schemaTypeInfoPropertiesChain]);

    return (
        deviceState ?
            <>
                <div className="map-pop-content-location-wrapper" style={{}}>
                    <LocationIcon size={22} />
                    <div className="map-pop-content-location">
                        <div>{device ? device.description : 'Нет данных'}</div>
                        <div>{device && device.objectLocation ? device.objectLocation.address : 'Нет данных'}</div>
                    </div>
                </div>
                <div className="map-pop-content-wrapper">
                    <table className="simple-grid" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                {
                                    !isXSmall
                                        ? <><th>Параметр</th><th>Значение</th></>
                                        : <th>Параметр/значение</th>
                                }
                            </tr>
                        </thead>
                        <tbody>
                            {
                                controlDefinitions && Object.keys(controlDefinitions).map((groupKey) => {
                                    const group = dataschema?.ui?.groups?.find((g: {id: number, name: string; }) => g.id.toString() === groupKey);
                                    return (
                                        <>
                                            <tr key={groupKey} style={{ backgroundColor: '#f0f0f0' }}>
                                                <td colSpan={2} style={{ height: '25px', textAlign: 'center', fontWeight: 'bold' }}> {group.caption}</td>
                                            </tr>
                                            {
                                                controlDefinitions[groupKey].map(({ typeInfo, propertiesChainValuePair }) => {
                                                    const valueContent = renderStateValueByPropertiesChain(typeInfo!, propertiesChainValuePair);
                                                    const label = propertiesChainValuePair.arrayIndex !== undefined ? `${typeInfo!.ui.label.text} ${propertiesChainValuePair.arrayIndex + 1}` : typeInfo!.ui.label.text;
                                                    return (
                                                        !isXSmall ?
                                                            <tr key={propertiesChainValuePair.propertiesChain}>
                                                                <td style={{ width: '250px' }}>{label}</td>
                                                                <td style={{ width: '120px', textAlign: 'center' }}>{valueContent}</td>
                                                            </tr> :
                                                            <>
                                                                <tr>
                                                                    <td style={{ width: '250px', fontWeight: '600' }}>{label}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td style={{ marginLeft: '10px' }}>{valueContent}</td>
                                                                </tr>
                                                            </>
                                                    )
                                                })
                                            }
                                        </>
                                    )
                                })
                            }
                        </tbody>
                    </table>
                </div>
            </>
            : null
    );
}