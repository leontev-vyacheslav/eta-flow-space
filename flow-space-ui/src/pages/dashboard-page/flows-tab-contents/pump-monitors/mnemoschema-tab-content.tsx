import { useCallback, useEffect, useRef } from "react";
import { useScreenSize } from "../../../../utils/media-query";
import { EmergencyLevel, PumpingStationIcon, StopIcon } from "./icons";
import { useDashboardPage } from "../../dashboard-page-context";

const MnemoschemaTabContent = () => {
    const {deviceState, mnemoschema} = useDashboardPage();
    const mnemoschemaContainerRef = useRef<HTMLDivElement>(null);
    const { isSmall, isXSmall, isLarge } = useScreenSize();

    const levelSensorsHandler = useCallback(() => {
        if (!deviceState) {
            return;
        }

        const dumpWaterElement = document.querySelector('#dump-water');
        const dumpBottomElement = document.querySelector('#dump-bottom')

        if (!dumpBottomElement || !dumpWaterElement || !deviceState.state) {
            return;
        }

        const dumpBottomY = dumpBottomElement.getAttribute('y')!;

        const setDumpWaterHeigh = (state: boolean, sensorName: string) => {
            const levelSensorElement = document.querySelector(`#${sensorName} circle`);
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

    const faultPumpHandler = useCallback(() => {
        const svgNs = 'http://www.w3.org/2000/svg';
        if (!deviceState) {
            return;
        }

        [1, 2].forEach(a => {
            if (!deviceState.state[`faultPump${a}`]) {
                return;
            }

            const stopIcon = document.querySelector(`#pump${a}-stop-icon`);
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

    const startStopPumpsHandler = useCallback(() => {
        if (!deviceState || !deviceState.state) {
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
            const pumpBlades = document.querySelector(`#pump-${i}-blades`);

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

    useEffect(() => {
        if (!mnemoschemaContainerRef.current || !mnemoschema) return;

        try {
            const parser = new DOMParser();
            const mnemoschemaDoc = parser.parseFromString(mnemoschema, 'image/svg+xml');
            mnemoschemaContainerRef.current.innerHTML = '';
            const svgElement = mnemoschemaContainerRef.current.appendChild(mnemoschemaDoc.documentElement);
            svgElement.setAttribute('height', isSmall || isXSmall ? '450px' : isLarge ? '520px' : '640px');
            if (isSmall || isXSmall) {
                svgElement.style.flex = '1';
            }
        } catch (error) {
            console.error('Error parsing SVG:', error);
        }
    }, [isLarge, isSmall, isXSmall, mnemoschema]);

    useEffect(() => {
        startStopPumpsHandler()
        levelSensorsHandler();
        faultPumpHandler();
    }, [levelSensorsHandler, faultPumpHandler, startStopPumpsHandler]);

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
            {mnemoschema
                ? <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }} ref={mnemoschemaContainerRef} />
                : null
            }
        </>
    );
}

export default MnemoschemaTabContent;