import dxPopover from "devextreme/ui/popover";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { EmergencyWarning, EmergencyWarningOff, WarningIcon } from "../constants/app-icons";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { useAppData } from "./app-data/app-data";
import { useAppSettings } from "./app-settings";
import { EmergencyPopoverContent } from "./emergency-popover-content";
import { emergencyMuteManager } from "../services/emergency-mute-manager";
import type { EmergencyModel } from "../models/flows/emergency-model";
import AppConstants from "../constants/app-constants";

import "./emergency-popover.scss";

export interface EmergencyContextModel {
    refreshEmergencyStates: () => Promise<void>;
    showEmergencyPopover: (position: { x: number; y: number }, emergencyState: EmergencyModel) => void;
    emergencyStates: EmergencyModel[];
}

interface EmergencyContextProviderProps {
    children: ReactNode;
}

const EmergencyContext = createContext<EmergencyContextModel | undefined>(undefined);

function EmergencyContextProvider({ children }: EmergencyContextProviderProps) {
    const popoverInstance = useRef<dxPopover<any>>(null);
    const { getEmergencyStatesAsync } = useAppData();
    const { flows } = useAppSettings();
    const [emergencyStates] = useState<EmergencyModel[]>([]);
    const popoverContentContainerRef = useRef<HTMLDivElement>(null);
    const popoverContentReactRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
    const popoverContainerRef = useRef<HTMLDivElement>(null);
    const popoverTitleContainerRef = useRef<HTMLDivElement>(null);
    const popoverTitleReactRootRef = useRef<ReturnType<typeof createRoot> | null>(null);

    const unmountEmergencyPopoverRoot = useCallback(() => {
        popoverContentReactRootRef.current?.unmount();
        popoverContentReactRootRef.current = null;

        popoverTitleReactRootRef.current?.unmount();
        popoverTitleReactRootRef.current = null;

        popoverContentContainerRef.current?.remove();
        popoverTitleContainerRef.current?.remove();
        setTimeout(() => {
            popoverContainerRef.current?.remove();
        }, 0);
    }, []);

    const EmergencyPopoverTitle = () => {
        return (
            <a className="popup-close-button" onClick={() => popoverInstance.current?.hide()}>
                <span aria-hidden="true">×</span>
            </a>
        );
    }

    const showEmergencyPopover = useCallback((position: { x: number; y: number }, emergencyState: EmergencyModel) => {
        const popoverContainer = document.createElement('div');
        popoverContainerRef.current = popoverContainer;

        popoverContainer.setAttribute('data-emergency-popover', '');
        document.body.appendChild(popoverContainer);

        const popoverContentContainer = document.createElement('div');
        popoverContentContainerRef.current = popoverContentContainer;

        const popoverContentReactRoot = createRoot(popoverContentContainer);
        popoverContentReactRootRef.current = popoverContentReactRoot;

        const popoverTitleContainer = document.createElement('div');
        popoverTitleContainerRef.current = popoverTitleContainer;

        const popoverTitleReactRoot = createRoot(popoverTitleContainer);
        popoverTitleReactRootRef.current = popoverTitleReactRoot;

        popoverInstance.current = new dxPopover(popoverContainer, {
            maxWidth: 300,
            minWidth: 300,
            shading: false,
            hideOnOutsideClick: true,
            showTitle: true,
            onHidden: () => {
                unmountEmergencyPopoverRoot();
            },
            contentTemplate: () => {
                popoverContentReactRoot.render(<EmergencyPopoverContent popoverInstance={popoverInstance} emergencyState={emergencyState} />);
                return popoverContentContainer;
            },

            titleTemplate: () => {
                popoverTitleReactRoot.render(
                    <EmergencyPopoverTitle />
                );
                return popoverTitleContainer;
            },
            wrapperAttr: {
                class: 'emergency-popover'
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
    }, [unmountEmergencyPopoverRoot]);



    const emergencyIconClickHandler = useCallback((event: PointerEvent, emergencyState: EmergencyModel) => {
        event.stopPropagation();

        if (popoverInstance.current) {
            popoverInstance.current.hide();
            popoverInstance.current.dispose();
        }
        unmountEmergencyPopoverRoot();

        document.querySelectorAll('[data-emergency-popover]').forEach(element => {
            try {
                element.remove();
            } catch (error) {
                console.error(error);
            }
        });

        showEmergencyPopover({ x: event.clientX, y: event.clientY }, emergencyState);
    }, [showEmergencyPopover, unmountEmergencyPopoverRoot]);

    const refreshEmergencyStates = useCallback(async () => {
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
                <WarningIcon size={18} style={{ fill: AppConstants.colors.emergencyWarningColor, cursor: 'pointer' }} />
                <EmergencyWarningOff data-emergency-mute-icon size={12} style={{ fill: AppConstants.colors.emergencyWarningColor, cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }} />
            </>
        );
        const emergencyUnmutedIcon = renderToStaticMarkup(
            <>
                <WarningIcon size={18} style={{ fill: AppConstants.colors.emergencyWarningColor, cursor: 'pointer' }} />
                <EmergencyWarning data-emergency-mute-icon size={12} style={{ fill: AppConstants.colors.emergencyWarningColor, cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }} />
            </>
        );
        const emergencyIconContainerElements = Array.from(document.querySelectorAll('[data-emergency-icon-container]'));

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
            await refreshEmergencyStates();
        })();

        const timer = setInterval(async () => {
            await refreshEmergencyStates();
        }, 10000);

        return () => {
            clearInterval(timer);
        };
    }, [refreshEmergencyStates]);

    useEffect(() => {
        return () => {
            if (popoverInstance.current) {
                popoverInstance.current.hide();
                popoverInstance.current.dispose();
            }
            unmountEmergencyPopoverRoot();
        };
    }, [unmountEmergencyPopoverRoot]);

    const contextValue: EmergencyContextModel = {
        refreshEmergencyStates,
        showEmergencyPopover,
        emergencyStates,
    };

    return <EmergencyContext.Provider value={contextValue}>{children}</EmergencyContext.Provider>;
}

const useEmergency = (): EmergencyContextModel => {
    const context = useContext(EmergencyContext);
    if (context === undefined) {
        throw new Error('useEmergency must be used within an EmergencyContextProvider');
    }
    return context;
};

export { EmergencyContextProvider, useEmergency }