import { Fragment, useCallback, useMemo } from "react";

import { useScreenSize } from "../../../../utils/media-query";
import { useDashboardPage } from "../../dashboard-page-context";
import { CheckedIcon, GraphIcon, LocationIcon, UncheckedIcon } from "../../../../constants/app-icons";
import { type PropertiesChainValuePairModel, type SchemaTypeInfoModel, type SchemaTypeInfoPropertiesChainModel } from "../../../../helpers/data-helper";
import { graphService } from "../../../../services/graph-service";
import { useParams } from "react-router";

export const MapPopupContent = () => {
    const { isXSmall } = useScreenSize();
    const { deviceState, dataschema, device, schemaTypeInfoPropertiesChain } = useDashboardPage();
    const { deviceId } = useParams();

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
            try {
                return dataschema.$defs[typeInfo.typeName].enumDescriptions[value].split(' - ').pop();;
            } catch {
                return (
                    <span style={{ color: 'red' }}>Ошибка ({value})</span>
                )
            }
        }

        if (typeInfo?.ui.editor.editorOptions.type === 'datetime') {
            if (typeInfo.typeName === 'integer') {
                return (new Date(value)).toLocaleString('ru-RU', {});
            } else if (typeInfo.typeName === 'string') {
                return (new Date(Date.parse(value))).toLocaleString('ru-RU', {});
            }
        }

        if (['integer', 'float', 'number'].includes(typeInfo.typeName)) {
            if (typeInfo?.unit) {
                return `${value} ${typeInfo?.unit}`;
            }

            return value;
        }

        return 'Нет данных';

    }, [dataschema]);

    const controlDefinitions = useMemo(() => {
        if (dataschema && schemaTypeInfoPropertiesChain) {
            const groups = dataschema.ui?.groups;
            const groupped =
                schemaTypeInfoPropertiesChain
                    .filter(p => (!!p.typeInfo?.ui.editor))
                    .reduce((acc, item) => {
                        const key = groups?.find((g: { id: number; }) => g.id === item.typeInfo!.ui.group)?.id || item.typeInfo!.ui.group;
                        acc[key] = acc[key] || [];
                        acc[key].push(item);

                        return acc;
                    }, {} as Record<string, SchemaTypeInfoPropertiesChainModel[]>)
            return groupped;
        }
    }, [dataschema, schemaTypeInfoPropertiesChain]);

    const graphIconClickHandler = useCallback((propertyInfo: SchemaTypeInfoPropertiesChainModel) => {
        if (!deviceId) {
            return;
        }

        graphService.show({
            deviceId: parseInt(deviceId),
            schemaTypeInfos: [propertyInfo]
        });
    }, [deviceId]);

    const statePropertyRowRender = useCallback(({ typeInfo, propertiesChainValuePair }: SchemaTypeInfoPropertiesChainModel) => {
        const valueContent = renderStateValueByPropertiesChain(typeInfo!, propertiesChainValuePair);
        const labelText = typeInfo!.ui.editor.label.text;
        const label = propertiesChainValuePair.arrayIndex !== undefined ? `${labelText} ${propertiesChainValuePair.arrayIndex + 1}` : labelText;
        return (
            !isXSmall ?
                <tr key={propertiesChainValuePair.propertiesChain}>
                    <td style={{ width: '250px' }}>{label}</td>
                    <td style={{ width: '120px', textAlign: 'center' }}>
                        <div style={{ display: 'flex' }}>
                            <div style={{ flex: 1 }}>
                                {valueContent}
                            </div>
                            <div style={{ marginRight: 10 }}>
                                {typeInfo!.ui.chart ? <GraphIcon data-state-graph={propertiesChainValuePair.propertiesChain} alignmentBaseline="middle" size={16} style={{ cursor: 'pointer' }}
                                    onClick={() => { graphIconClickHandler({ typeInfo, propertiesChainValuePair }); }} /> : <div style={{ width: 16 }} />}
                            </div>
                        </div>
                    </td>
                </tr> :
                <Fragment key={propertiesChainValuePair.propertiesChain}>
                    <tr >
                        <td style={{ width: '250px', fontWeight: '600' }}>{label}</td>
                    </tr>
                    <tr>
                        <td style={{ marginLeft: '10px' }}>{valueContent}</td>
                    </tr>
                </Fragment>
        );
    }, [graphIconClickHandler, isXSmall, renderStateValueByPropertiesChain]);

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
                                controlDefinitions && Object.keys(controlDefinitions)
                                    .sort((a, b) => {
                                        const groupA = dataschema.ui.groups.find((g: { id: number }) => g.id.toString() === a).order,
                                            groupB = dataschema.ui.groups.find((g: { id: number }) => g.id.toString() === b).order;
                                        return (groupA - groupB);
                                    })
                                    .map((groupKey) => {
                                        const group = dataschema?.ui?.groups?.find((g: { id: number, name: string; }) => g.id.toString() === groupKey);
                                        return (
                                            <Fragment key={groupKey}>
                                                <tr key={groupKey} style={{ backgroundColor: '#f0f0f0' }}>
                                                    <td colSpan={2} style={{ height: '25px', textAlign: 'center', fontWeight: 'bold' }}> {group.caption}</td>
                                                </tr>
                                                {
                                                    controlDefinitions[groupKey].map(({ typeInfo, propertiesChainValuePair }) => (statePropertyRowRender({ typeInfo, propertiesChainValuePair })))
                                                }
                                            </Fragment>
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