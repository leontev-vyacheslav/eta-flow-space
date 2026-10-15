import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popup as PopupRef, type IPopupOptions } from 'devextreme-react/popup';
import { formatMessage } from 'devextreme/localization';
import AppModalPopup from '../app-modal-popup/app-modal-popup';
import { type AppModalPopupProps } from '../../../models/app-modal-popup-props';
import { RootDialogService } from '../root-dialog-service';
import { SharedAreaProvider } from '../../../contexts/shared-area';
import { AppDataProvider, useAppData } from '../../../contexts/app-data/app-data';
import { MainMenu } from '../../menu/main-menu/main-menu';
import { AdditionalMenuIcon, CloseIcon, CopyIcon, RefreshIcon, StateTimeIcon } from '../../../constants/app-icons';
import { useScreenSize } from '../../../utils/media-query';
import { highlightJson } from '../../../utils/json-highlight';
import { proclaim } from '../../../utils/proclaim';
import { getQuickGuid } from '../../../utils/uuid';

import './device-state-json-dialog.scss'

export type DeviceStateJsonDialogParams = {
    // the device whose states request returns the state (the dashboard's device; it returns every device of its diagram)
    statesDeviceId: number,
    device: { id: number, code: string, name: string }
};

type DeviceStateJsonDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & DeviceStateJsonDialogParams;

const DeviceStateJsonDialog = ({ statesDeviceId, device, ...props }: DeviceStateJsonDialogProps) => {
    const { getDeviceStatesAsync } = useAppData();
    const { isXSmall, isSmall } = useScreenSize();
    const popupRef = useRef<PopupRef>(null);
    const [stateJson, setStateJson] = useState<string | null>(null);
    const [stateTime, setStateTime] = useState<Date | null>(null);
    const [isReceived, setIsReceived] = useState<boolean>(false);
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());

    useEffect(() => {
        let cancelled = false;

        getDeviceStatesAsync(statesDeviceId).then(deviceStates => {
            if (cancelled) {
                return;
            }
            const state = deviceStates?.[device.code]?.state;
            setStateJson(state === undefined ? null : JSON.stringify(state, null, 2));
            // the device's own poll time; the time of the request when the state has none
            setStateTime(state?.timestamp ? new Date(state.timestamp) : new Date());
            setIsReceived(true);
        });

        return () => { cancelled = true; };
    }, [device.code, getDeviceStatesAsync, statesDeviceId, refreshToken]);

    // the loading panel of the requests stays above the dialog
    useEffect(() => {
        const loadPanel = document.querySelector('.dx-loadpanel-wrapper') as HTMLDivElement | null;
        if (loadPanel) {
            loadPanel.style.zIndex = (parseInt(loadPanel.style.zIndex) + 1).toString();
        }
    }, []);

    const copyState = useCallback(async () => {
        if (stateJson === null) {
            return;
        }
        try {
            await navigator.clipboard.writeText(stateJson);
            proclaim({ type: 'success', message: 'Состояние скопировано в буфер обмена.' });
        } catch {
            proclaim({ type: 'error', message: 'Не удалось скопировать состояние в буфер обмена.' });
        }
    }, [stateJson]);

    const highlightedState = useMemo(() => stateJson === null ? null : highlightJson(stateJson), [stateJson]);

    return (
        <AppModalPopup
            ref={popupRef}
            width={isXSmall || isSmall ? '95%' : '60%'}
            height={isXSmall || isSmall ? '80%' : '70%'}
            dragEnabled={!(isXSmall || isSmall)}
            resizeEnabled={!(isXSmall || isSmall)}
            titleRender={() => (
                <div className='device-state-json-title'>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '20px', fontWeight: 500 }}>Состояние</span>
                        <span style={{ fontSize: '12px', color: 'rgb(118, 118, 118)' }}>{`${device.name} [${device.id}]`}</span>
                        {/* the line keeps its place before the state arrives: the popup sizes its content by the first title height */}
                        <span style={{ fontSize: '12px', color: 'rgb(118, 118, 118)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {stateTime
                                ? <><StateTimeIcon size={12} />{stateTime.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</>
                                : ' '}
                        </span>
                    </div>
                    <div style={{ display: 'flex' }}>
                        <MainMenu items={[{
                            icon: () => <AdditionalMenuIcon size={20} color='black' />,
                            items: [
                                {
                                    icon: () => <RefreshIcon size={20} />,
                                    text: 'Обновить...',
                                    onClick: () => { setRefreshToken(getQuickGuid()); }
                                },
                                {
                                    icon: () => <CopyIcon size={20} />,
                                    text: 'Копировать',
                                    onClick: () => { copyState(); }
                                },
                            ]
                        }]} />
                        <MainMenu items={[{
                            icon: () => <CloseIcon size={20} color='black' />,
                            onClick: () => { popupRef.current?.instance.hide(); }
                        }]} />
                    </div>
                </div>
            )}
            contentRender={() => highlightedState
                ? <pre className='device-state-json'>{highlightedState}</pre>
                : isReceived && <div className='dx-datagrid-nodata'>{formatMessage('dxDataGrid-noDataText')}</div>}
            {...props}
        />
    );
}

class DeviceStateJsonDialogService extends RootDialogService {
    protected readonly dialogId = 'device-state-json-dialog-root';

    public show(params: DeviceStateJsonDialogParams) {
        super.show(() => {
            this.root!.render(
                <SharedAreaProvider>
                    <AppDataProvider>
                        <DeviceStateJsonDialog
                            {...params}
                            callback={() => { }}
                            onHidden={() => { this.hide(); }}
                        />
                    </AppDataProvider>
                </SharedAreaProvider>
            );
        });
    }
}

export const deviceStateJsonService = new DeviceStateJsonDialogService();
