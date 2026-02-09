import { useEffect, useRef, useState } from "react";
import { useLongPress } from "use-long-press";
import { useDashboardPage } from "../../dashboard-page-context";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { useParams } from "react-router";
import { useMnemoschemaPopover } from "./use-mnemoschema-popover";
import { useMnemoschemaStateSetup } from "./use-mnemoschema-state-setup";
import routes from '../../../../constants/app-api-routes';
import { useMnemoschemaInjectCss } from "./use-mnemoschema-inject-css";
import { useMnemoschemaRestoreTransformState } from "./use-mnemoschema-restore-transform-state";
import { NoData } from "../../../../components/no-data-widget/no-data-widget";


export const Mnemoschema = ({ onBeforeMount: onBeforeMount, onAfterMount: onAfterMount }: { onBeforeMount?: (mnemoschemaElement: HTMLElement) => void, onAfterMount?: (mnemoschemaElement: HTMLElement) => void }) => {
    const { flowCode } = useParams();
    const { mnemoschema, isValidDeviceState, dataschema, schemaTypeInfoPropertiesChain, deviceState } = useDashboardPage();
    const containerRef = useRef<HTMLDivElement>(null);
    const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);
    const [isInitComplete, setIsInitComplete] = useState<boolean>(false);
    const mnemoschemaClickHandler = useMnemoschemaPopover();
    const stateSetup = useMnemoschemaStateSetup();
    const injectCss = useMnemoschemaInjectCss();


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

        let mnemoschemaElement: HTMLElement | null = null;
        let disposed = false;

        const run = async () => {
            let plugInModule = null;
            try {
                plugInModule = await import(/* @vite-ignore */`${routes.host}/static/flows/${flowCode}/${flowCode}-mnemo-schema.js?v=${Date.now()}`);
            } catch (error) {
                console.error(error);
            }

            if (disposed) return;

            const parser = new DOMParser();
            const mnemoschemaDoc = parser.parseFromString(mnemoschema, 'image/svg+xml');

            try {
                const { onBeforeMount: onBeforeMountPluggable, onAfterMount: onAfterMountPluggable } = plugInModule?.create?.() ?? {};
                containerRef.current!.innerHTML = '';

                stateSetup(mnemoschemaDoc.documentElement);
                onBeforeMount?.(mnemoschemaDoc.documentElement);
                onBeforeMountPluggable?.(mnemoschemaDoc.documentElement, deviceState);

                mnemoschemaElement = containerRef.current!.appendChild(
                    mnemoschemaDoc.documentElement
                );

                await injectCss(mnemoschemaElement);

                onAfterMount?.(mnemoschemaElement);
                onAfterMountPluggable?.(mnemoschemaElement, deviceState);
                mnemoschemaElement.addEventListener(
                    'click',
                    mnemoschemaClickHandler
                );
            } catch (error) {
                console.error(error);
            }
        };

        run();

        return () => {
            disposed = true;
            mnemoschemaElement?.removeEventListener(
                'click',
                mnemoschemaClickHandler
            );
        };
    }, [flowCode, deviceState, mnemoschema, onBeforeMount, onAfterMount, stateSetup, schemaTypeInfoPropertiesChain, dataschema, mnemoschemaClickHandler, injectCss]);

    useMnemoschemaRestoreTransformState(flowCode, transformComponentRef, () => setIsInitComplete(true));

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
                <div {...longPressBinder()} style={{ display: 'flex', alignItems: 'center', opacity: (isValidDeviceState ? 1 : 1) }} ref={containerRef} />
            </TransformComponent>
        </TransformWrapper>
        : <NoData />
}