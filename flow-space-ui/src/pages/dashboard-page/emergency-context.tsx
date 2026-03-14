import dxPopover from "devextreme/ui/popover";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { WarningIcon } from "../../constants/app-icons";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { useAppData } from "../../contexts/app-data/app-data";
import { useAppSettings } from "../../contexts/app-settings";
import { EmergencyPopoverContent } from "./emergency-popover-content";
import { emergencyMuteManager } from "../../services/emergency-mute-manager";
import type { EmergencyModel } from "../../models/flows/emergency-model";

export type EmergencyContextModel = any;

const EmergencyContext = createContext({} as EmergencyContextModel);

function EmergencyContextProvider(props: any) {
    const popoverInstance = useRef<dxPopover<any>>(null);
    const { getEmergencyStatesAsync } = useAppData();
    const { flows } = useAppSettings();

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
                offset: {
                    x: event.clientX,
                    y: event.clientY
                },
                collision: 'flipfit'
            },
        });

        popoverInstance.current.show();
    }, []);



    const updateEmergencyState = useCallback(async () => {
        if (!flows) {
            return;
        }

        const emergencyStates = await getEmergencyStatesAsync();
        if (!emergencyStates) {
            return;
        }

        emergencyMuteManager.processEmergencyStates(emergencyStates);

        const warningIcon = renderToStaticMarkup(
            <WarningIcon size={20} style={{ fill: '#FFC107', cursor: 'pointer' }} />
        );
        const deviceEmergencyElements = Array.from(document.querySelectorAll('.side-navigation-menu [data-device-emergency]'));

        flows?.flatMap(f => (f.devices ?? []))
            .forEach(d => {
                const deviceEmergencyElement = deviceEmergencyElements.find(e => e.getAttribute('data-device-emergency') === d.id.toString());
                if (!deviceEmergencyElement) {
                    return;
                }
                deviceEmergencyElement.firstChild?.remove();

                const state = emergencyStates.find(s => s.deviceId === d.id);
                if (!state) {
                    return;
                }

                const warningIconElement = new DOMParser().parseFromString(warningIcon, 'image/svg+xml').documentElement;
                warningIconElement.addEventListener('click', (e) => emergencyIconClickHandler(e, state))
                deviceEmergencyElement.append(warningIconElement);
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