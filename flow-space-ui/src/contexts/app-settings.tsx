import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AppSettingsContextModel, AppSettingsDataContextModel } from '../models/app-settings-context';
import type { AppBaseProviderProps } from '../models/app-base-provider-props';
import type { FlowModel } from '../models/flows/flow-model';
import { useAppData } from './app-data/app-data';
import { WarningIcon } from '../constants/app-icons';
import { renderToStaticMarkup } from 'react-dom/server';
import dxPopover from 'devextreme/ui/popover';

const AppSettingsContext = createContext<AppSettingsContextModel>({} as AppSettingsContextModel);

const useAppSettings = () => useContext(AppSettingsContext);

function AppSettingsProvider(props: AppBaseProviderProps) {
    const { getFlowListAsync, getEmergencyStatesAsync } = useAppData();
    const [flows, setFlows] = useState<FlowModel[]>();
    const popoverInstance = useRef<dxPopover<any>>(null);

    const [appSettingsData, setAppSettingsData] = useState<AppSettingsDataContextModel>({
        isShowFooter: true,
    });

    const emegrencyPopoverContent = useCallback((emergencyState: any) => {
        return (
            <table className='simple-grid'>
                <thead>
                    <tr><th colSpan={2}>Нештатные / аварийные ситуации</th></tr>
                </thead>
                <tbody>
                    {(emergencyState.reasons as any[]).map((r: any) => <tr><td>{r.description}</td></tr>)}

                </tbody>
            </table>
        );
    }, []);

    const emrgencyIconClickHandler = useCallback((event: PointerEvent, emergencyState: any) => {
        event.stopPropagation();

        if (popoverInstance.current) {
            popoverInstance.current.dispose();
        }

        document.querySelectorAll('[data-emergency-popover]').forEach(element => {
            try {
                element.remove();
            } catch (error) {
                console.error(error);
            }
        });

        const root = document.createElement('div');
        root.setAttribute('data-emergency-popover', '');
        document.body.appendChild(root);

        const html = renderToStaticMarkup(emegrencyPopoverContent(emergencyState));

        popoverInstance.current = new dxPopover(root, {
            minWidth: 200,
            maxWidth: 300,
            shading: false,
            hideOnOutsideClick: true,
            contentTemplate: () => {
                const div = document.createElement('div');
                div.innerHTML = html;
                return div;
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
    }, [emegrencyPopoverContent]);

    const updateEmegrencyState = useCallback(async () => {
        const emergencyStates = await getEmergencyStatesAsync();
        if (!emergencyStates) {
            return;
        }

        const warningIcon = renderToStaticMarkup(
            <WarningIcon size={20} style={{ fill: '#FFC107', verticalAlign: 'middle', cursor: 'pointer' }} />
        );
        const deviceEmergencyElements = Array.from(document.querySelectorAll('.side-navigation-menu [data-device-emergency]'));

        flows
            ?.flatMap(f => (f.devices))
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
                warningIconElement.addEventListener('click', (e) => emrgencyIconClickHandler(e, state))
                deviceEmergencyElement.append(warningIconElement);
            });
    }, [emrgencyIconClickHandler, flows, getEmergencyStatesAsync]);

    useEffect(() => {
        (async () => {
            const flows = await getFlowListAsync();
            if (flows) {
                setFlows(flows);
            }
        })();

    }, [getFlowListAsync]);

    useEffect(() => {
        setAppSettingsData(previous => {
            return { ...previous, workDate: new Date() };
        });


        (async () => {
            await updateEmegrencyState();
        })();


        const timer1 = setInterval(async () => {
            setAppSettingsData(previous => {
                return { ...previous, workDate: new Date() };
            });
        }, 60000);

        const timer2 = setInterval(async () => {
            await updateEmegrencyState();
        }, 10000);

        return () => {
            clearInterval(timer1);
            clearInterval(timer2);
        };
    }, [flows, updateEmegrencyState]);

    return <AppSettingsContext.Provider value={{
        appSettingsData,
        setAppSettingsData,
        flows,
    }} {...props} />;
}

export { AppSettingsProvider, useAppSettings };
