import { useEffect, useRef, useState } from "react";
import { useLongPress } from "use-long-press";
import { useDashboardPage } from "../../dashboard-page-context";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { useMnemoschemaPopover } from "./use-mnemoschema-popover";
import { useMnemoschemaStateSetup } from "./use-mnemoschema-state-setup";
import routes from '../../../../constants/app-api-routes';
import { useMnemoschemaInjectCss } from "./use-mnemoschema-inject-css";
import { useMnemoschemaRestoreTransformState } from "./use-mnemoschema-restore-transform-state";
import { NoData } from "../../../../components/no-data-widget/no-data-widget";
import { kebabToCamel } from "../../../../utils/string-utils";
import { useAppData } from "../../../../contexts/app-data/app-data";


export const Mnemoschema = ({ onBeforeMount: onBeforeMount, onAfterMount: onAfterMount }: { onBeforeMount?: (mnemoschemaElement: HTMLElement) => void, onAfterMount?: (mnemoschemaElement: HTMLElement) => void }) => {
    const { staticFilesManifest } = useAppData();
    const { mnemoschema, dataschema, schemaTypeInfoPropertiesChain, deviceState, device } = useDashboardPage();
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

        const abortController = new AbortController();
        const { signal } = abortController;
        let mnemoschemaElement: HTMLElement | null = null;
        let disposed = false;

        const run = async () => {
            let plugInModule = null;
            try {
                if (device) {
                    plugInModule = await import(/* @vite-ignore */ `${routes.host}/static/devices/${device.code}/mnemo-schema.js?v=${Date.now()}`);
                }
            } catch (error) {
                console.error(error);
            }
            if (disposed) return;

            const parser = new DOMParser();
            const mnemoschemaDoc = parser.parseFromString(mnemoschema, 'image/svg+xml');

            try {
                const { onBeforeMount: onBeforeMountPluggable, onAfterMount: onAfterMountPluggable } =
                    plugInModule?.create?.({ signal }) ?? {};

                containerRef.current!.innerHTML = '';
                stateSetup(mnemoschemaDoc.documentElement);
                onBeforeMount?.(mnemoschemaDoc.documentElement);
                onBeforeMountPluggable?.(mnemoschemaDoc.documentElement, deviceState);

                mnemoschemaElement = containerRef.current!.appendChild(mnemoschemaDoc.documentElement);

                await injectCss(mnemoschemaElement);
                if (disposed) return; // ← guard after async

                onAfterMount?.(mnemoschemaElement);
                onAfterMountPluggable?.(mnemoschemaElement, deviceState);

                mnemoschemaElement.addEventListener('click', mnemoschemaClickHandler, { signal });
            } catch (error) {
                console.error(error);
            }
        };

        run();

        return () => {
            disposed = true;
            abortController.abort();
        };
    }, [device, deviceState, mnemoschema, onBeforeMount, onAfterMount, stateSetup, schemaTypeInfoPropertiesChain, dataschema, mnemoschemaClickHandler, injectCss, staticFilesManifest]);

    useMnemoschemaRestoreTransformState(device?.code, transformComponentRef, () => setIsInitComplete(true));

    return mnemoschema && schemaTypeInfoPropertiesChain && deviceState?.state && Object.keys(deviceState.state).length !== 0
        ?
        <TransformWrapper ref={transformComponentRef}
            smooth={true}
            wheel={{ step: 0.0025, }}
            doubleClick={{ step: 1 }}
            minScale={0.5}
            onTransform={(_, transformedState) => {
                if (isInitComplete && device) {
                    localStorage.setItem(`mnemoschemaTransformedState_${kebabToCamel(device.code)}`, JSON.stringify(transformedState));
                }
            }}
        >
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                <div {...longPressBinder()} style={{ display: 'flex', alignItems: 'center' }} ref={containerRef} />
            </TransformComponent>
        </TransformWrapper>
        : <NoData />
}

export default Mnemoschema;