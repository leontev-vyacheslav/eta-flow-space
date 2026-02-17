import AppModalPopup from '../app-modal-popup/app-modal-popup';
import { useScreenSize } from '../../../utils/media-query';
import type { EventInfo } from 'devextreme/events';
import type { GraphDialogProps } from '../../../models/graph-dialog-props';
import { GraphChart } from './graph-chart';
import type { MenuItemModel } from '../../../models/menu-item-model';
import { AdditionalMenuIcon, RefreshIcon } from '../../../constants/app-icons';
import { useMemo, useRef } from 'react';
import { Popup as PopupRef } from "devextreme-react/popup";
import { GraphDialogTitle } from './graph-dialog-title';
import { GraphDialogContextProvider, useGraphDialog } from './graph-dialog-context';
import { getQuickGuid } from '../../../utils/uuid';

const GraphDialogInternal = (props: GraphDialogProps) => {
    const { isXSmall, isSmall } = useScreenSize();
    const popupRef = useRef<PopupRef>(null);
    const { setRefreshToken } = useGraphDialog();

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
                    }
                ]
            }
        ] as MenuItemModel[];
    }, [setRefreshToken]);

    return (
        <AppModalPopup
            ref={popupRef}
            width={isXSmall || isSmall ? '95%' : undefined}
            height={isXSmall || isSmall ? '80%' : undefined}
            titleRender={() => <GraphDialogTitle popupRef={popupRef} menuItems={menuItems} />}
            dragEnabled={!(isXSmall || isSmall)}
            resizeEnabled
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

                const graphDialogSizeStr = localStorage.getItem('graph_dialog_size');
                if (graphDialogSizeStr) {
                    try {
                        const size = JSON.parse(graphDialogSizeStr);
                        e.component.option('width', size.width);
                        e.component.option('height', size.height);
                    } catch {
                        e.component.option('width', 640);
                        e.component.option('height', 480);
                    }
                }
            }}
            onOptionChanged={(e) => {
                if (isXSmall || isSmall) {
                    return;
                }
                const width = e.component.option('width');
                const height = e.component.option('height');
                if (width && height) {
                    localStorage.setItem('graph_dialog_size', JSON.stringify({
                        width,
                        height
                    }));
                }
            }}
        >
            <GraphChart {...props} />
        </AppModalPopup >
    );
}

export const GraphDialog = (props: GraphDialogProps) => {
    return <GraphDialogContextProvider {...props}>
        <GraphDialogInternal {...props} />
    </GraphDialogContextProvider>
}