import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popup as PopupRef, type IPopupOptions } from 'devextreme-react/popup';
import { formatMessage } from 'devextreme/localization';
import AppModalPopup from '../app-modal-popup/app-modal-popup';
import { type AppModalPopupProps } from '../../../models/app-modal-popup-props';
import type { MenuItemModel } from '../../../models/menu-item-model';
import { RootDialogService } from '../root-dialog-service';
import { SharedAreaProvider } from '../../../contexts/shared-area';
import { AppDataProvider, useAppData } from '../../../contexts/app-data/app-data';
import { MainMenu } from '../../menu/main-menu/main-menu';
import { AdditionalMenuIcon, CloseIcon, CopyIcon, RefreshIcon, StateTimeIcon } from '../../../constants/app-icons';
import { useScreenSize } from '../../../utils/media-query';
import { highlightJson } from '../../../utils/json-highlight';
import { proclaim } from '../../../utils/proclaim';
import { getQuickGuid } from '../../../utils/uuid';

import './json-view-dialog.scss'

// what the dialog shows: the device's latest state or its data schema
export type JsonViewKind = 'state' | 'dataschema';

export type JsonViewDialogParams = {
    kind: JsonViewKind,
    // the device whose states request returns the state (the dashboard's device; it returns every device of its diagram)
    statesDeviceId: number,
    device: { id: number, code: string, name: string }
};

const kindTexts: Record<JsonViewKind, { title: string, copied: string, notCopied: string }> = {
    state: {
        title: 'Состояние',
        copied: 'Состояние скопировано в буфер обмена.',
        notCopied: 'Не удалось скопировать состояние в буфер обмена.'
    },
    dataschema: {
        title: 'Схема данных',
        copied: 'Схема данных скопирована в буфер обмена.',
        notCopied: 'Не удалось скопировать схему данных в буфер обмена.'
    },
};

type JsonViewDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & JsonViewDialogParams;

const JsonViewDialog = ({ kind, statesDeviceId, device, ...props }: JsonViewDialogProps) => {
    const { getDeviceStatesAsync, getDeviceStateDataschemaAsync, staticFilesManifest } = useAppData();
    const { isXSmall, isSmall } = useScreenSize();
    const popupRef = useRef<PopupRef>(null);
    const [json, setJson] = useState<string | null>(null);
    const [stateTime, setStateTime] = useState<Date | null>(null);
    const [isReceived, setIsReceived] = useState<boolean>(false);
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());
    const texts = kindTexts[kind];

    useEffect(() => {
        let cancelled = false;

        if (kind === 'state') {
            getDeviceStatesAsync(statesDeviceId).then(deviceStates => {
                if (cancelled) {
                    return;
                }
                const state = deviceStates?.[device.code]?.state;
                setJson(state === undefined ? null : JSON.stringify(state, null, 2));
                // the device's own poll time; the time of the request when the state has none
                setStateTime(state?.timestamp ? new Date(state.timestamp) : new Date());
                setIsReceived(true);
            });
        } else if (staticFilesManifest) {
            // waits for the manifest, so the schema is requested by its versioned (cached) address
            getDeviceStateDataschemaAsync(device.code).then(dataschema => {
                if (cancelled) {
                    return;
                }
                setJson(dataschema === undefined ? null : JSON.stringify(dataschema, null, 2));
                setIsReceived(true);
            });
        }

        return () => { cancelled = true; };
    }, [kind, device.code, getDeviceStatesAsync, getDeviceStateDataschemaAsync, staticFilesManifest, statesDeviceId, refreshToken]);

    // the loading panel of the requests stays above the dialog
    useEffect(() => {
        const loadPanel = document.querySelector('.dx-loadpanel-wrapper') as HTMLDivElement | null;
        if (loadPanel) {
            loadPanel.style.zIndex = (parseInt(loadPanel.style.zIndex) + 1).toString();
        }
    }, []);

    const copyJson = useCallback(async () => {
        if (json === null) {
            return;
        }
        try {
            await navigator.clipboard.writeText(json);
            proclaim({ type: 'success', message: texts.copied });
        } catch {
            proclaim({ type: 'error', message: texts.notCopied });
        }
    }, [json, texts]);

    const highlightedJson = useMemo(() => json === null ? null : highlightJson(json), [json]);

    // a schema is requested by its manifest version, so refreshing it would only return the same file
    const commands: MenuItemModel[] = [
        ...(kind === 'state' ? [{
            icon: () => <RefreshIcon size={20} />,
            text: 'Обновить...',
            onClick: () => { setRefreshToken(getQuickGuid()); }
        }] : []),
        {
            icon: () => <CopyIcon size={20} />,
            text: 'Копировать',
            onClick: () => { copyJson(); }
        },
    ];

    return (
        <AppModalPopup
            ref={popupRef}
            width={isXSmall || isSmall ? '95%' : '60%'}
            height={isXSmall || isSmall ? '80%' : '70%'}
            dragEnabled={!(isXSmall || isSmall)}
            resizeEnabled={!(isXSmall || isSmall)}
            titleRender={() => (
                <div className='json-view-title'>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '20px', fontWeight: 500 }}>{texts.title}</span>
                        <span style={{ fontSize: '12px', color: 'rgb(118, 118, 118)' }}>{`${device.name} [${device.id}]`}</span>
                        {/* the state's time line keeps its place before the state arrives: the popup sizes its content by the first title height */}
                        {kind === 'state' &&
                            <span style={{ fontSize: '12px', color: 'rgb(118, 118, 118)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                {stateTime
                                    ? <><StateTimeIcon size={12} />{stateTime.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</>
                                    : ' '}
                            </span>}
                    </div>
                    <div style={{ display: 'flex' }}>
                        <MainMenu items={[{
                            icon: () => <AdditionalMenuIcon size={20} color='black' />,
                            items: commands
                        }]} />
                        <MainMenu items={[{
                            icon: () => <CloseIcon size={20} color='black' />,
                            onClick: () => { popupRef.current?.instance.hide(); }
                        }]} />
                    </div>
                </div>
            )}
            contentRender={() => highlightedJson
                ? <pre className='json-view'>{highlightedJson}</pre>
                : isReceived && <div className='dx-datagrid-nodata'>{formatMessage('dxDataGrid-noDataText')}</div>}
            {...props}
        />
    );
}

class JsonViewDialogService extends RootDialogService {
    protected readonly dialogId = 'json-view-dialog-root';

    public show(params: JsonViewDialogParams) {
        super.show(() => {
            this.root!.render(
                <SharedAreaProvider>
                    <AppDataProvider>
                        <JsonViewDialog
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

export const jsonViewService = new JsonViewDialogService();
