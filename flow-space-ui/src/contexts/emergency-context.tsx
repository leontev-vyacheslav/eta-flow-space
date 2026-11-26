import dxPopover from "devextreme/ui/popover";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { EmergencyWarning, EmergencyWarningOff, WarningIcon } from "../constants/app-icons";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { useAppData } from "./app-data/app-data";
import { EmergencyPopoverContent } from "./emergency-popover-content";
import { emergencyMuteManager } from "../services/emergency-mute-manager";
import type { EmergencyModel } from "../models/flows/emergency-model";
import AppConstants from "../constants/app-constants";
import { useAppSettingsStore } from "./app-settings-store";
import { proclaim } from "../utils/proclaim";

import "./emergency-popover.scss";

export interface EmergencyContextModel {
    refreshEmergencyStates: () => Promise<void>;
    // draws the icons from the last poll again, e.g. once the side menu has (re)rendered its icon slots
    redrawEmergencyIcons: () => void;
    showEmergencyPopover: (position: { x: number; y: number }, emergencyState: EmergencyModel) => void;
}

interface EmergencyContextProviderProps {
    children: ReactNode;
}

const EmergencyContext = createContext<EmergencyContextModel | undefined>(undefined);

function EmergencyContextProvider({ children }: EmergencyContextProviderProps) {
    const popoverInstance = useRef<dxPopover<any>>(null);
    const { getEmergencyStatesAsync } = useAppData();
    const { flows, appSettingsData } = useAppSettingsStore();
    // the poll reads the latest values from refs: flows/settings arriving or changing must not restart it (and refetch)
    const flowsRef = useRef(flows);
    const appSettingsDataRef = useRef(appSettingsData);
    useEffect(() => {
        flowsRef.current = flows;
        appSettingsDataRef.current = appSettingsData;
    }, [flows, appSettingsData]);
    const hasFlows = !!flows && flows.length > 0;
    const lastEmergencyStatesRef = useRef<EmergencyModel[] | null>(null);
    const pollingRef = useRef(false);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const activeRefreshRef = useRef<{ controller: AbortController; promise: Promise<void> } | null>(null);
    const pollFailedRef = useRef(false);
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

    const EmergencyMutedIcon = ({ color }: { color: string }) => (
        <div>
            <WarningIcon size={18} style={{ fill: color, cursor: 'pointer' }} />
            <EmergencyWarningOff data-emergency-mute-icon size={12} style={{ fill: color, cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }} />
        </div>
    );

    const EmergencyUnmutedIcon = ({ color }: { color: string }) => (
        <div>
            <WarningIcon size={18} style={{ fill: color, cursor: 'pointer' }} />
            <EmergencyWarning data-emergency-mute-icon size={12} style={{ fill: color, cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }} />
        </div>
    );

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
            maxWidth: 320,
            minWidth: 320,
            shading: false,
            hideOnOutsideClick: true,
            showTitle: true,
            onHidden: () => {
                unmountEmergencyPopoverRoot();
            },
            contentTemplate: () => {
                popoverContentReactRoot.render(
                    <EmergencyPopoverContent popoverInstance={popoverInstance} emergencyState={emergencyState} />
                );
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

    // icons go into the [data-emergency-icon-container] slots that exist right now; slots rendered later
    // (side menu drawn after the poll, or re-rendered) are filled by redrawEmergencyIcons
    const drawEmergencyIcons = useCallback(() => {
        const emergencyStates = lastEmergencyStatesRef.current;
        const flows = flowsRef.current;
        if (!emergencyStates || !flows) {
            return;
        }

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
                const isConnected = emergencyState.reasons.some(r => r.id === AppConstants.connectedEmergencyReasonId);

                const emergencyIconDom = new DOMParser().parseFromString(
                    emergencyMuteManager.isDeviceMuted(emergencyState)
                        ? renderToStaticMarkup(<EmergencyMutedIcon color={isConnected ? AppConstants.colors.emergencyCriticalColor : AppConstants.colors.emergencyWarningColor} />)
                        : renderToStaticMarkup(<EmergencyUnmutedIcon color={isConnected ? AppConstants.colors.emergencyCriticalColor : AppConstants.colors.emergencyWarningColor} />),
                    'text/html'
                );

                (emergencyIconDom.body.firstElementChild as HTMLElement).addEventListener('click', (e) => emergencyIconClickHandler(e, emergencyState));
                emergencyIconContainerElement.append(...emergencyIconDom.body.childNodes);
            });
    }, [emergencyIconClickHandler]);

    const refreshEmergencyStates = useCallback(function refreshEmergencyStates(): Promise<void> {
        if (!pollingRef.current || !flowsRef.current) {
            return Promise.resolve();
        }
        if (activeRefreshRef.current) {
            return activeRefreshRef.current.promise;
        }
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = undefined;
        const controller = new AbortController();

        const warnOnce = () => {
            if (!pollFailedRef.current) {
                pollFailedRef.current = true;
                proclaim({
                    type: 'warning',
                    message: lastEmergencyStatesRef.current
                        ? 'Не удалось обновить аварийные события. Отображаются последние полученные данные.'
                        : 'Не удалось обновить аварийные события. Данные пока недоступны.',
                });
            }
        };
        // Defer the request until its shared promise is registered, including synchronous failures.
        const promise = Promise.resolve().then(async () => {
            try {
                const emergencyStates = await getEmergencyStatesAsync({ signal: controller.signal, suppressShowError: true });
                if (controller.signal.aborted || !pollingRef.current) {
                    return;
                }
                if (!emergencyStates) {
                    warnOnce();
                    return;
                }

                const appSettingsData = appSettingsDataRef.current;
                emergencyMuteManager.processEmergencyStates(emergencyStates, appSettingsData?.userSettings?.notifications?.web.enabled, appSettingsData?.userSettings?.notifications?.web.soundType);

                lastEmergencyStatesRef.current = emergencyStates;
                drawEmergencyIcons();
                pollFailedRef.current = false;
            } catch {
                if (!controller.signal.aborted && pollingRef.current) {
                    warnOnce();
                }
            } finally {
                if (activeRefreshRef.current?.controller === controller) {
                    activeRefreshRef.current = null;
                    if (pollingRef.current && !controller.signal.aborted) {
                        pollTimerRef.current = setTimeout(() => { void refreshEmergencyStates(); }, AppConstants.pollInterval);
                    }
                }
            }
        });
        activeRefreshRef.current = { controller, promise };
        return promise;
    }, [drawEmergencyIcons, getEmergencyStatesAsync]);

    useEffect(() => {
        if (!hasFlows) {
            return;
        }

        pollingRef.current = true;
        pollFailedRef.current = false;
        void refreshEmergencyStates();

        return () => {
            pollingRef.current = false;
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = undefined;
            activeRefreshRef.current?.controller.abort();
            activeRefreshRef.current = null;
        };
    }, [hasFlows, refreshEmergencyStates]);

    useEffect(() => {
        return () => {
            if (popoverInstance.current) {
                popoverInstance.current.hide();
                popoverInstance.current.dispose();
            }
            queueMicrotask(() => {
                unmountEmergencyPopoverRoot();
            });
        };
    }, [unmountEmergencyPopoverRoot]);

    const contextValue: EmergencyContextModel = {
        refreshEmergencyStates,
        redrawEmergencyIcons: drawEmergencyIcons,
        showEmergencyPopover,
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
