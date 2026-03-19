import dxPopover from "devextreme/ui/popover";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { EmergencyWarning, EmergencyWarningOff, WarningIcon } from "../constants/app-icons";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { useAppData } from "./app-data/app-data";
import { useAppSettings } from "./app-settings";
import { EmergencyPopoverContent } from "./emergency-popover-content";
import { emergencyMuteManager } from "../services/emergency-mute-manager";
import type { EmergencyModel } from "../models/flows/emergency-model";

export type EmergencyContextModel = any;

const EmergencyContext = createContext({} as EmergencyContextModel);

function EmergencyContextProvider(props: any) {
    const popoverInstance = useRef<dxPopover<any>>(null);
    const { getEmergencyStatesAsync } = useAppData();
    const { flows } = useAppSettings();

    const renderPopover = useCallback(({ position, emergencyState }: { position: { x: number, y: number }, emergencyState: EmergencyModel }) => {
        const popoverContainer = document.createElement('div');
        popoverContainer.setAttribute('data-emergency-popover', '');
        document.body.appendChild(popoverContainer);

        const popoverContentContainer = document.createElement('div');
        const popoverContentReactRoot = createRoot(popoverContentContainer);

        popoverInstance.current = new dxPopover(popoverContainer, {
            maxWidth: 300,
            minWidth: 300,
            shading: false,
            hideOnOutsideClick: true,
            onHidden: () => {
                popoverContentReactRoot.unmount();
                popoverContentContainer.remove();
                setTimeout(() => {
                    popoverContainer.remove();
                }, 0);
            },
            contentTemplate: () => {
                popoverContentReactRoot.render(<EmergencyPopoverContent popoverInstance={popoverInstance} emergencyState={emergencyState} />);
                return popoverContentContainer;
            },
            wrapperAttr: {
                class: 'mnemoschema-popover'
            },
            position: {
                at: "top left",
                my: "top left",
                of: window,
                offset: { ...position },
                collision: 'flipfit'
            },
        });

        popoverInstance.current.show();
    }, []);

    const emergencyIconClickHandler = useCallback((event: PointerEvent, emergencyState: EmergencyModel) => {
        event.stopPropagation();

        if (popoverInstance.current) {
            popoverInstance.current.hide();
            popoverInstance.current.dispose();
        }

        document.querySelectorAll('[data-emergency-popover]').forEach(element => {
            try {
                element.remove();
            } catch (error) {
                console.error(error);
            }
        });

        renderPopover({ position: { x: event.clientX, y: event.clientY }, emergencyState });
    }, [renderPopover]);

    const updateEmergencyState = useCallback(async () => {
        if (!flows) {
            return;
        }

        const emergencyStates = await getEmergencyStatesAsync();
        if (!emergencyStates) {
            return;
        }

        emergencyMuteManager.processEmergencyStates(emergencyStates);

        const emergencyMutedIcon = renderToStaticMarkup(
            <>
                <WarningIcon size={18} style={{ fill: '#FFC107', cursor: 'pointer' }} />
                <EmergencyWarningOff data-emergency-mute-icon size={12} style={{ fill: '#FFC107', cursor: 'pointer', position: 'absolute',top: '-5px', right: '-5px' }} />
            </>
        );
        const emergencyUnmutedIcon = renderToStaticMarkup(
            <>
                <WarningIcon size={18} style={{ fill: '#FFC107', cursor: 'pointer' }} />
                <EmergencyWarning  data-emergency-mute-icon size={12} style={{ fill: '#FFC107', cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }} />
            </>
        );
        const emergencyIconContainerElements = Array.from(document.querySelectorAll('.side-navigation-menu [data-emergency-icon-container]'));

        flows?.flatMap(f => (f.devices ?? []))
            .forEach(d => {
                const emergencyIconContainerElement = emergencyIconContainerElements.find(e => e.getAttribute('data-emergency-icon-container') === d.id.toString());
                if (!emergencyIconContainerElement) {
                    return;
                }
                emergencyIconContainerElement.innerHTML = '';

                const emergencyState = emergencyStates.find(s => s.deviceId === d.id);
                if (!emergencyState) {
                    return;
                }

                const emergencyIconDom = new DOMParser().parseFromString(
                    emergencyMuteManager.isDeviceMuted(emergencyState)
                        ? emergencyMutedIcon
                        : emergencyUnmutedIcon,
                    'text/html'
                );

                (emergencyIconDom.body.firstElementChild as HTMLElement).addEventListener('click', (e) => emergencyIconClickHandler(e, emergencyState));
                emergencyIconContainerElement.append(...emergencyIconDom.body.childNodes);
            });
    }, [emergencyIconClickHandler, flows, getEmergencyStatesAsync]);

    useEffect(() => {
        (async () => {
            await updateEmergencyState();
        })();

        const timer = setInterval(async () => {
            await updateEmergencyState();
        }, 10000);

        return () => {
            clearInterval(timer);
        };
    }, [updateEmergencyState]);

    return <EmergencyContext.Provider {...props} value={{}} />
}

const useEmergency = () => useContext(EmergencyContext);

export { EmergencyContextProvider, useEmergency }