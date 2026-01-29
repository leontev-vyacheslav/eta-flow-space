import { useCallback } from "react";
import { EmergencyLevel, PumpingStationIcon, StopIcon } from "../icons";
import { useDashboardPage } from "../../../dashboard-page-context";
import { Mnemoschema } from "../../../components/mnemoschema/mnemoschema";
import { useScreenSize } from "../../../../../utils/media-query";

const MnemoschemaTabContent = () => {
    const { isSmall, isXSmall, isLarge } = useScreenSize();
    const { deviceState } = useDashboardPage();

    const levelSensorsHandler = useCallback((mnemoschemaElement: HTMLElement) => {
        if (!deviceState) {
            return;
        }

        const dumpWaterElement = mnemoschemaElement.querySelector('#dump-water');
        const dumpBottomElement = mnemoschemaElement.querySelector('#dump-bottom')

        if (!dumpBottomElement || !dumpWaterElement || !deviceState.state) {
            return;
        }

        const dumpBottomY = dumpBottomElement.getAttribute('y')!;

        const setDumpWaterHeigh = (state: boolean, sensorName: string) => {
            const levelSensorElement = mnemoschemaElement.querySelector(`#${sensorName} circle`);
            if (!levelSensorElement) {
                return;
            }

            if (state) {
                levelSensorElement.setAttribute('fill', '#808080');
                const targetY = levelSensorElement.getAttribute('cy')!;
                dumpWaterElement.setAttribute('y', targetY);
                dumpWaterElement.setAttribute('height', (parseFloat(dumpBottomY) - parseFloat(targetY)).toString());
            }
            else {
                levelSensorElement.setAttribute('fill', '#f1f2f2');
            }
        }
        const map = Object.entries({
            lowLevel: 'low-level-sensor',
            midLevel: 'middle-level-sensor',
            hiLevel: 'high-level-sensor',
            emergencyLevel: 'emergency-level-sensor'
        });

        map.forEach(([k, v]) => {
            setDumpWaterHeigh(deviceState.state[k] as boolean, v);
        });

        const everyLevelSensorOff = map.every(([k]) => !(deviceState.state[k] as boolean));
        if (everyLevelSensorOff) {
            dumpWaterElement.setAttribute('height', '0');
        }
    }, [deviceState]);

    const faultPumpHandler = useCallback((mnemoschemaElement: HTMLElement) => {
        const svgNs = 'http://www.w3.org/2000/svg';
        if (!deviceState) {
            return;
        }

        [1, 2].forEach(a => {
            if (!deviceState.state[`faultPump${a}`]) {
                return;
            }

            const stopIcon = mnemoschemaElement.querySelector(`#pump${a}-stop-icon`);
            if (!stopIcon) {
                return;
            }

            stopIcon.setAttribute('width', '35');
            const num = stopIcon.querySelector(`#pump${a}-stop-icon-num`);
            if (num) {
                num.remove();
            }

            const textElement = document.createElementNS(svgNs, 'text');
            textElement.setAttribute('id', `pump${a}-stop-icon-num`);
            textElement.setAttribute('transform', 'translate(22 7)');
            textElement.setAttribute('font-size', '8');

            const tspan = document.createElementNS(svgNs, 'tspan');
            tspan.setAttribute('x', '0');
            tspan.setAttribute('y', '0');
            tspan.textContent = `${a}`;

            textElement.appendChild(tspan);
            stopIcon.appendChild(textElement);
        });

    }, [deviceState]);

    const startStopPumpsHandler = useCallback((mnemoschemaElement: HTMLElement) => {
        if (!deviceState || !deviceState.state || Object.keys(deviceState.state).length === 0) {
            return;
        }
        const changeHighlightStroke = (blades: NodeListOf<SVGLineElement> | undefined, color: string) => {
            if (blades) {
                Array.from(blades).forEach(b => {
                    b.setAttribute('stroke', color);
                });
            }
        }
        const pumpBladesGroupNumber = [1, 2];
        pumpBladesGroupNumber.forEach(i => {
            const pumpBlades = mnemoschemaElement.querySelector(`#pump-${i}-blades`);

            const pumpBladesAnimation = pumpBlades?.querySelector('animateTransform') as SVGAnimateElement;
            const blades: NodeListOf<SVGLineElement> | undefined = pumpBlades?.querySelectorAll('line');

            if (!deviceState.state.startStop) {
                changeHighlightStroke(blades, '#939598');
                pumpBladesAnimation?.endElement();
                return;
            }

            if (deviceState.state[`statePump${i}`]) {
                changeHighlightStroke(blades, '#fefefe');
                pumpBladesAnimation?.beginElement();
            } else {
                changeHighlightStroke(blades, '#939598');
                pumpBladesAnimation?.endElement();
            }
        });
    }, [deviceState]);

    return (
        <>
            {deviceState ?
                <div style={{ position: 'absolute', top: '30px', left: '110px' }}>
                    {deviceState.state.startStop === false ? <StopIcon size={28} color='#804040' /> : null}
                    {deviceState.state.emergencyLevel === true ? <EmergencyLevel size={28} color='#804040' /> : null}
                    {deviceState.state.faultPump1 === true ? <PumpingStationIcon id='pump1-stop-icon' size={30} color='#804040' /> : null}
                    {deviceState.state.faultPump2 === true ? <PumpingStationIcon id='pump2-stop-icon' size={30} color='#804040' /> : null}
                </div>
                : null
            }
            <Mnemoschema
                onBeforeMount={(mnemoschemaElement: HTMLElement) => {
                    mnemoschemaElement.setAttribute("height", isSmall || isXSmall ? '450px' : isLarge ? '520px' : '640px');
                    if (isSmall || isXSmall) {
                        mnemoschemaElement.style.flex = '1';
                    }
                    levelSensorsHandler(mnemoschemaElement);
                    faultPumpHandler(mnemoschemaElement);
                }}
                onAfterMount={(mnemoschemaElement: HTMLElement) => {
                    startStopPumpsHandler(mnemoschemaElement);
                }}
            />
        </>
    );
}

export default MnemoschemaTabContent;