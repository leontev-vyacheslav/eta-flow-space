import { useCallback, useEffect, useRef, useState } from "react";
import { useLongPress } from "use-long-press";
import { useDashboardPage } from "../../dashboard-page-context";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { useParams } from "react-router";
import { useMnemoschemaPopover } from "./use-mnemoschema-popover";
import { useMnemoschemaStateSetup } from "./use-mnemoschema-state-setup";
import { formatMessage } from "devextreme/localization";


export const Mnemoschema = ({ onBeforeMount: onBeforeMount, onAfterMount: onAfterMount }: { onBeforeMount?: (mnemoschemaElement: HTMLElement) => void, onAfterMount?: (mnemoschemaElement: HTMLElement) => void }) => {
    const { flowCode } = useParams();
    const { mnemoschema, isValidDeviceState, dataschema, schemaTypeInfoPropertiesChain, deviceState } = useDashboardPage();
    const containerRef = useRef<HTMLDivElement>(null);
    const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);
    const [isInitComplete, setIsInitComplete] = useState<boolean>(false);
    const mnemoschemaClickHandler = useMnemoschemaPopover();
    const stateSetup = useMnemoschemaStateSetup();

    const NoData = useCallback(() => {
        return <div className='dx-widget dx-nodata' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}><div>{formatMessage('noDataText')}</div></div>
    }, []);

    const longPressBinder = useLongPress(
        () => {
            transformComponentRef.current!.setTransform(0, 0, 1);
        }, {
        threshold: 250,
        cancelOnMovement: 5,
        captureEvent: true,
    });

    useEffect(() => {
        if (!containerRef.current || !mnemoschema) {
            return;
        }
        let mnemoschemaElement: HTMLElement | undefined = undefined;

        try {
            const parser = new DOMParser();
            const mnemoschemaDoc = parser.parseFromString(mnemoschema, 'image/svg+xml');
            containerRef.current.innerHTML = '';

            stateSetup(mnemoschemaDoc.documentElement);

            if (onBeforeMount) {
                onBeforeMount(mnemoschemaDoc.documentElement);
            }

            mnemoschemaElement = containerRef.current.appendChild(mnemoschemaDoc.documentElement);

            if (onAfterMount) {
                onAfterMount(mnemoschemaElement);
            }
        } catch (error) {
            console.error(error);
        }

        mnemoschemaElement?.addEventListener('click', mnemoschemaClickHandler);

        return () => {
            mnemoschemaElement?.removeEventListener('click', mnemoschemaClickHandler);
        };
    }, [mnemoschema, onBeforeMount, onAfterMount, stateSetup, schemaTypeInfoPropertiesChain, dataschema, mnemoschemaClickHandler]);

    useEffect(() => {
        const timer = setTimeout(() => {
            const savedState = localStorage.getItem(`mnemoschema_transformed_state_${flowCode}`);
            if (savedState && transformComponentRef.current) {
                try {
                    const { scale, positionX, positionY } = JSON.parse(savedState);
                    transformComponentRef.current.setTransform(positionX, positionY, scale);
                } catch (e) {
                    console.error("Failed to restore transform state", e);
                }
            }
            setIsInitComplete(true);
        }, 500);

        return () => clearTimeout(timer);
    }, [flowCode]);

    return mnemoschema && schemaTypeInfoPropertiesChain && deviceState?.state && Object.keys(deviceState.state).length !== 0
        ?
        <TransformWrapper ref={transformComponentRef}
            doubleClick={{ step: 1 }}
            minScale={0.5}
            onTransformed={(_, transformedState) => {
                if (isInitComplete) {
                    localStorage.setItem(`mnemoschema_transformed_state_${flowCode}`, JSON.stringify(transformedState));
                }
            }}
        >
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                <div {...longPressBinder()} style={{ display: 'flex', alignItems: 'center', opacity: (isValidDeviceState ? 1 : 0.7) }} ref={containerRef} />
            </TransformComponent>
        </TransformWrapper>
        : <NoData />
}