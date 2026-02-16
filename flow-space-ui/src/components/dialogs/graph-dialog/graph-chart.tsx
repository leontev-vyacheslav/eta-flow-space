import Chart from "devextreme-react/chart";
import { formatMessage } from "devextreme/localization";
import type { GraphChartProps } from "../../../models/graph-dialog-props";
import { useRef } from "react";
import { useDeviceStateProperties as useDeviceStatePropertiesToday } from "./use-device-state-properties";

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
                    ...t.typeInfo?.ui.chart.series
                };
            })}
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
    );
}