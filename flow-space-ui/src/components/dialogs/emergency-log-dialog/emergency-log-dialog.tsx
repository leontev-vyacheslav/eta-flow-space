import AppModalPopup from '../app-modal-popup/app-modal-popup';
import { useScreenSize } from '../../../utils/media-query';
import type { EventInfo } from 'devextreme/events';
import type { MenuItemModel } from '../../../models/menu-item-model';
import { AdditionalMenuIcon, DateRangeIcon, GroupedList, OneHourIcon, RefreshIcon, TwentyFourHourIcon, UngroupedList } from '../../../constants/app-icons';
import { useEffect, useMemo, useRef } from 'react';
import { Popup as PopupRef } from "devextreme-react/popup";
import { EmergencyLogDialogTitle } from './emergency-log-dialog-title';
import { getQuickGuid } from '../../../utils/uuid';
import { EmergencyLogDialogContextProvider, useEmergencyLogDialog } from './emergency-log-dialog-context';
import type { EmergencyLogDialogProps } from '../../../models/emergency-log-dialog-props';
import { EmergencyLogGrid } from './emergency-log-grid';

const EmergencyLogDialogInternal = (props: EmergencyLogDialogProps) => {
    const { isXSmall, isSmall } = useScreenSize();
    const popupRef = useRef<PopupRef>(null);
    const { setRefreshToken, setSamplingHorizon, samplingHorizon, grouped, setGrouped } = useEmergencyLogDialog();

    const menuItems = useMemo(() => {
        return [
            {
                icon: () => <AdditionalMenuIcon size={20} color='black' />,
                items: [
                    {
                        icon: () => <RefreshIcon size={20} />,
                        text: 'Обновить...',
                        onClick: () => {
                            setRefreshToken(getQuickGuid());
                        }
                    }, {
                        icon: () => grouped ? <UngroupedList size={20} /> : <GroupedList size={20} />,
                        text: grouped ? 'Разгруппировать' : 'Группировать...',
                        onClick: () => {
                            setGrouped(prev => !prev);
                        }
                    },
                    {
                        text: "Выборка",
                        icon: () => <DateRangeIcon size={24} />,
                        items: [
                            {
                                icon: () => <OneHourIcon size={24} />,
                                text: 'За последний час',
                                textFontWeight: samplingHorizon === -1 ? 'bold' : null,
                                onClick: () => {
                                    setSamplingHorizon(-1);
                                }
                            },
                            {
                                icon: () => <TwentyFourHourIcon size={24} />,
                                text: 'За текущие сутки',
                                textFontWeight: samplingHorizon === -24 ? 'bold' : null,
                                onClick: () => {
                                    setSamplingHorizon(-24);
                                }
                            }
                        ]
                    },
                ]
            }
        ] as MenuItemModel[];
    }, [grouped, samplingHorizon, setGrouped, setRefreshToken, setSamplingHorizon]);

    useEffect(() => {
        setTimeout(() => {
            popupRef.current?.instance.repaint();
        }, 500);
    }, []);

    return (
        <AppModalPopup
            ref={popupRef}
            width={isXSmall || isSmall ? '95%' : undefined}
            height={isXSmall || isSmall ? '80%' : undefined}
            titleRender={() => <EmergencyLogDialogTitle device={props.device} popupRef={popupRef} menuItems={menuItems} />}
            dragEnabled={!(isXSmall || isSmall)}
            resizeEnabled
            hideOnOutsideClick
            {...props}
            callback={(modalResult) => {
                if (props.callback) {
                    props.callback(modalResult);
                }
            }}
            onContentReady={(e: EventInfo<any>) => {
                if (isXSmall || isSmall) {
                    return;
                }

                const graphDialogSizeStr = localStorage.getItem('emergencyLogDialogSize');
                if (graphDialogSizeStr) {
                    try {
                        const size = JSON.parse(graphDialogSizeStr);
                        e.component.option('width', size.width);
                        e.component.option('height', size.height);
                    } catch {
                        e.component.option('width', 640);
                        e.component.option('height', 480);
                    }
                } else {
                    e.component.option('width', 640);
                    e.component.option('height', 480);
                }
            }}
            onOptionChanged={(e) => {
                if (isXSmall || isSmall) {
                    return;
                }
                const width = e.component.option('width');
                const height = e.component.option('height');
                if (width && height) {
                    localStorage.setItem('emergencyLogDialogSize', JSON.stringify({
                        width,
                        height
                    }));
                }
            }}
        >
            <EmergencyLogGrid />
        </AppModalPopup >
    );
}

export const EmergencyLogDialog = (props: EmergencyLogDialogProps) => {
    return <EmergencyLogDialogContextProvider {...props} >
            <EmergencyLogDialogInternal {...props} />
    </EmergencyLogDialogContextProvider>
}