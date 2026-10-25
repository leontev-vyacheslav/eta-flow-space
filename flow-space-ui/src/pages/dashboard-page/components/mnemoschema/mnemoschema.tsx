import { useEffect, useRef, useState } from "react";
import { useLongPress } from "use-long-press";
import { useDashboardPage } from "../../dashboard-page-context";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { useMnemoschemaPopover } from "./use-mnemoschema-popover";
import { useMnemoschemaStateSetup } from "./use-mnemoschema-state-setup";
import routes from '../../../../constants/app-api-routes';
import { useMnemoschemaInjectCss } from "./use-mnemoschema-inject-css";
import { useMnemoschemaSize } from "./use-mnemoschema-size";
import { useMnemoschemaRestoreTransformState } from "./use-mnemoschema-restore-transform-state";
import { NoData } from "../../../../components/no-data-widget/no-data-widget";
import { kebabToCamel } from "../../../../utils/string-utils";
import { useAppData } from "../../../../contexts/app-data/app-data";


export const Mnemoschema = ({ onBeforeMount: onBeforeMount, onAfterMount: onAfterMount }: { onBeforeMount?: (mnemoschemaElement: HTMLElement) => void, onAfterMount?: (mnemoschemaElement: HTMLElement) => void }) => {
    const { staticFilesManifest } = useAppData();
    const { mnemoschema, dataschemas, schemasTypeInfoPropertiesChain, deviceStates, device } = useDashboardPage();
    const containerRef = useRef<HTMLDivElement>(null);
    const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);
    const [isInitComplete, setIsInitComplete] = useState<boolean>(false);
    // the diagram is re-mounted on every state poll; the selected device is shown to the plug-in only once
    const selectedDeviceCodeRef = useRef<string | null>(null);
    const mnemoschemaClickHandler = useMnemoschemaPopover();
    const stateSetup = useMnemoschemaStateSetup();
    const injectCss = useMnemoschemaInjectCss();
    const applySize = useMnemoschemaSize();

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
                // a diagram has a plug-in only when the manifest lists its script
                const plugInVersion = device ? staticFilesManifest?.[device.mnemoschemaCode]?.["js"] : undefined;
                if (device && plugInVersion) {
                    plugInModule = await import(/* @vite-ignore */ `${routes.host}/static/devices/${device.mnemoschemaCode}/mnemo-schema.js?v=${plugInVersion}`);
                }
            } catch (error) {
                console.error(error);
            }
            if (disposed) return;

            const parser = new DOMParser();
            const mnemoschemaDoc = parser.parseFromString(mnemoschema, 'image/svg+xml');

            try {
                const { onBeforeMount: onBeforeMountPluggable, onAfterMount: onAfterMountPluggable, onDeviceSelected: onDeviceSelectedPluggable } =
                    plugInModule?.create?.({ signal }) ?? {};

                stateSetup(mnemoschemaDoc.documentElement);
                applySize(mnemoschemaDoc.documentElement);
                onBeforeMount?.(mnemoschemaDoc.documentElement);
                onBeforeMountPluggable?.(mnemoschemaDoc.documentElement, deviceStates);

                // the stylesheet goes in before the diagram is shown: a diagram shown without it for a frame
                // flickers on every state poll (the flame glow vanishes and restarts)
                await injectCss(mnemoschemaDoc.documentElement);
                if (disposed || !containerRef.current) return; // ← guard after async

                // the previous diagram is replaced in one step, so the page never shows an empty container
                // (the element leaves the parsed document: keep it before moving it)
                mnemoschemaElement = mnemoschemaDoc.documentElement;
                containerRef.current.replaceChildren(mnemoschemaElement);

                // CSS animations (the flame glow) run on the document's clock: a re-mounted diagram continues them
                // where the previous one was instead of restarting them
                mnemoschemaElement.getAnimations({ subtree: true })
                    .filter(animation => animation instanceof CSSAnimation)
                    .forEach(animation => { animation.startTime = 0; });

                onAfterMount?.(mnemoschemaElement);
                onAfterMountPluggable?.(mnemoschemaElement, deviceStates);

                if (device && selectedDeviceCodeRef.current !== device.code) {
                    selectedDeviceCodeRef.current = device.code;
                    onDeviceSelectedPluggable?.(mnemoschemaElement, device.code);
                }

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
    }, [device, deviceStates, mnemoschema, onBeforeMount, onAfterMount, stateSetup, schemasTypeInfoPropertiesChain, dataschemas, mnemoschemaClickHandler, injectCss, applySize, staticFilesManifest]);

    useMnemoschemaRestoreTransformState(device?.mnemoschemaCode, transformComponentRef, () => setIsInitComplete(true));

    return mnemoschema && schemasTypeInfoPropertiesChain && deviceStates && Object.keys(deviceStates).length !== 0
        ?
        <TransformWrapper ref={transformComponentRef}
            smooth={true}
            wheel={{ step: 0.0025, }}
            doubleClick={{ step: 1 }}
            minScale={0.5}
            onTransform={(_, transformedState) => {
                if (isInitComplete && device) {
                    localStorage.setItem(`mnemoschemaTransformedState_${kebabToCamel(device.mnemoschemaCode)}`, JSON.stringify(transformedState));
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