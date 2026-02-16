import Chart, { Tooltip } from "devextreme-react/chart";
import { formatMessage } from "devextreme/localization";
import type { GraphChartProps } from "../../../models/graph-dialog-props";
import { useRef } from "react";
import { useDeviceStateProperties as useDeviceStatePropertiesToday } from "./use-device-state-properties";
import { GraphIcon, TimeChartSingIcon } from "../../../constants/app-icons";
import type { SchemaTypeInfoPropertiesChainModel } from "../../../helpers/data-helper";

export const ChartTooltip = ({ info, schemaTypeInfos }: { info: any, schemaTypeInfos: SchemaTypeInfoPropertiesChainModel[] }) => {

    return (
        <div style={{ display: "flex", flexDirection: "column", padding: 8, gap: 8}}>
            <div style={{ display: "flex",  alignItems: 'center',  gap: 8}}>
                <TimeChartSingIcon size={18} />
                <div>Время:</div>
                <div>{(info.point.data.createdAt as Date).toLocaleString('ru-RU')}</div>
            </div>
            {
                schemaTypeInfos.map(t => {
                    return (
                        <div style={{ display: "flex",  alignItems: 'center',  gap: 8}}>
                            <GraphIcon size={18} />
                            <div>{t.typeInfo?.ui.editor.label.text}{":"}</div>
                            <div>{info.point.data[t.propertiesChainValuePair.propertiesChain].toLocaleString(undefined, { minimumFractionDigits: 1 })} {t.typeInfo?.unit ? `${t.typeInfo?.unit}` : ''}</div>
                        </div>
                    )
                })
            }
        </div>
    );
}

export const GraphChart = (props: GraphChartProps) => {
    const chartRef = useRef<Chart>(null);
    const stateProperties = useDeviceStatePropertiesToday(props);

    return (
        <Chart
            ref={chartRef}
            dataSource={stateProperties}
            width='100%'
            height='100%'
            zoomAndPan={{ allowMouseWheel: true, argumentAxis: 'zoom', dragToZoom: true }}
            margin={{ top: 10, bottom: 10, left: 10, right: 10 }}

            series={
                props.schemaTypeInfos.map(t => {
                    return {
                        valueField: t.propertiesChainValuePair.propertiesChain,
                        argumentField: "createdAt",
                        type: 'spline',

                        axis: t.propertiesChainValuePair.propertiesChain,
                        point: {
                            visible: true,
                            size: 8
                        },
                        ...t.typeInfo?.ui.chart.series,
                    };
                })
            }
            valueAxis={
                props.schemaTypeInfos.map(t => {
                    return {
                        name: t.propertiesChainValuePair.propertiesChain,
                        position: 'left',
                        title: {
                            text: t.typeInfo?.ui.editor.label.text + (t.typeInfo?.unit ? `, (${t.typeInfo?.unit})` : ''),
                            font: {
                                size: 12
                            }
                        },
                        ...t.typeInfo?.ui.chart.valueAxis,
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
            <Tooltip
                enabled={true}
                zIndex={3000}
                arrowLength={5}
                opacity={1}
                contentRender={(info: any) => <ChartTooltip info={info} schemaTypeInfos={props.schemaTypeInfos} />}
            />
        </Chart >
    );
}