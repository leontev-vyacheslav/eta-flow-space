import Chart, { Tooltip } from "devextreme-react/chart";
import { formatMessage } from "devextreme/localization";
import type { GraphChartProps } from "../../../models/graph-dialog-props";
import { useEffect, useRef } from "react";
import { GraphChartTooltip } from "./graph-chart-tooltip";
import { useGraphDialog } from "./graph-dialog-context";
import { useLongPress } from "use-long-press";

export const GraphChart = (props: GraphChartProps) => {
    const chartRef = useRef<Chart>(null);
    const dateRangerRef = useRef<HTMLDivElement>(null);
    const { stateProperties, dateRange, refreshToken } = useGraphDialog();
    const longPressBinder = useLongPress(
        () => {
            const chart = chartRef.current!.instance;
            chart.resetVisualRange();
        }, {
        threshold: 250,
        cancelOnMovement: 5,
        captureEvent: true,
    });

    useEffect(() => {
        if (!dateRangerRef.current) {
            return;
        }
        dateRangerRef.current.innerText = `${dateRange.beginDate.toLocaleString('ru-Ru')} - ${dateRange.endDate.toLocaleString('ru-Ru')}`;

    }, [dateRange, refreshToken]);

    return (
        <div  {...longPressBinder()} style={{ width: '100%', height: '97%' }}>
            <Chart
                ref={chartRef}
                dataSource={stateProperties}
                width='100%'
                onZoomEnd={(e) => {
                    if (!dateRangerRef.current) {
                        return;
                    }
                    if ((e.rangeStart instanceof Date) && (e.rangeEnd instanceof Date)) {
                        dateRangerRef.current.innerText = `${e.rangeStart!.toLocaleString('ru-Ru')} - ${e.rangeEnd!.toLocaleString('ru-Ru')}`;
                    } else {
                        dateRangerRef.current.innerText = `${dateRange.beginDate.toLocaleString('ru-Ru')} - ${dateRange.endDate.toLocaleString('ru-Ru')}`;
                    }
                }}
                scrollBar={{
                    position: 'top',
                    visible: true,
                }}
                height='100%'
                zoomAndPan={{ allowMouseWheel: true, argumentAxis: 'both', dragToZoom: true, allowTouchGestures: true }}
                margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
                palette={'Office'}
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
                    contentRender={(info: any) => <GraphChartTooltip info={info} schemaTypeInfos={props.schemaTypeInfos} />}
                />

            </Chart >
            <div ref={dateRangerRef} style={{ fontSize: 10, color: 'rgb(118, 118, 118)', paddingLeft: 30 }}></div>
        </div>
    );
}