import { Chart } from 'devextreme-react/chart';

import AppModalPopup from '../app-modal-popup/app-modal-popup';
import { type AppModalPopupProps } from '../../../models/app-modal-popup-props';
import type { IPopupOptions } from 'devextreme-react/popup';
import { useScreenSize } from '../../../utils/media-query';
import { useAppData } from '../../../contexts/app-data/app-data';
import { useEffect, useRef, useState } from 'react';
import type { DeviceStatePropertiesModel } from '../../../models/flows/device-state-model';
import { startOfDay, endOfDay } from 'date-fns';
import { formatMessage } from 'devextreme/localization';
import type { SchemaTypeInfoPropertiesChainModel } from '../../../helpers/data-helper';

export type GraphDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & {
    deviceId: number;
    schemaTypeInfos: SchemaTypeInfoPropertiesChainModel[]
};

export const GraphDialog = (props: GraphDialogProps) => {
    const chartRef = useRef<Chart>(null);
    const { getDeviceStatesByDatesAsync } = useAppData();
    const { isXSmall, isSmall } = useScreenSize();
    const [stateProperties, setStateProperties] = useState<DeviceStatePropertiesModel[] | undefined>();

    useEffect(() => {
        (async () => {
            const now = new Date();
            const beginDate = startOfDay(now);
            const endDate = endOfDay(now);
            let stateProperties = await getDeviceStatesByDatesAsync(
                props.deviceId,
                beginDate,
                endDate,
                props.schemaTypeInfos.map(t => (t.propertiesChainValuePair.propertiesChain))
            );

            if (stateProperties) {
                stateProperties = stateProperties.map(stateItem => {
                    props.schemaTypeInfos.forEach(t => {
                        const fieldName = t.propertiesChainValuePair.propertiesChain;
                        let typedValue = stateItem[fieldName];
                        if (['integer', 'number'].includes(t.typeInfo!.typeName)) {
                            typedValue = Number(stateItem[fieldName]);
                        }
                        stateItem[fieldName] = typedValue
                    });
                    return stateItem;
                });
            }

            setStateProperties(stateProperties);
        })();
    }, [getDeviceStatesByDatesAsync, props.deviceId, props.schemaTypeInfos]);

    return (
        <AppModalPopup
            title='График'
            width={isXSmall || isSmall ? '95%' : 640}
            height={isXSmall || isSmall ? '80%' : 480}
            dragEnabled={!(isXSmall || isSmall)}
            resizeEnabled
            {...props}
            callback={(modalResult) => {
                if (props.callback) {
                    props.callback(modalResult);
                }
            }}
        >
            <Chart
                ref={chartRef}
                dataSource={stateProperties}
                width='100%'
                height='100%'
                zoomAndPan={{ allowMouseWheel: true, argumentAxis: 'zoom', dragToZoom: true }}
                margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
                tooltip={{
                    enabled: true,
                    arrowLength: 5,
                    opacity: 1
                }}
                series={props.schemaTypeInfos.map(t => {
                    return {
                        valueField: t.propertiesChainValuePair.propertiesChain,
                        argumentField: "createdAt",
                        type: 'spline',
                        axis: t.propertiesChainValuePair.propertiesChain,
                        point: {
                            visible: true,
                            size: 8
                        },
                    };
                })}
                valueAxis={
                    props.schemaTypeInfos.map(t => {
                        return {
                            name: t.propertiesChainValuePair.propertiesChain,
                            position: 'left',
                            title: {
                                text: t.typeInfo?.ui.editor.label.text,
                                font: {
                                    size: 12
                                }
                            }
                        }
                    })
                }
                legend={{
                    visible: false
                }}
                commonAxisSettings={{
                    valueMarginsEnabled: false
                }}
                crosshair={{
                    enabled: true,
                    color: 'grey',
                    dashStyle: 'dot',
                    horizontalLine: false
                }}
                argumentAxis={
                    {
                        grid: {
                            visible: true
                        },
                        minorGrid: {
                            visible: false
                        },
                        title: {
                            text: formatMessage('app-measurement-time'),
                            font: {
                                size: 12
                            },

                        },
                        label: {
                            rotationAngle: 270,
                            indentFromAxis: 15,
                            displayMode: 'rotate',
                            format: 'shortTime'
                        }
                    }
                }
            >

            </Chart>
        </AppModalPopup >
    );
}