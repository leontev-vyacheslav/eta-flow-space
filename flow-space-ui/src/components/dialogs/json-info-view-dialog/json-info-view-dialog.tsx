import { useEffect } from 'react';
import { type AppModalPopupProps } from '../../../models/app-modal-popup-props';
import AppModalPopup from '../app-modal-popup/app-modal-popup';
import type { IPopupOptions } from 'devextreme-react/popup';
import { formatMessage } from 'devextreme/localization';
import { useScreenSize } from '../../../utils/media-query';
import ReactJson from "react-json-view";
import { RootDialogService } from '../root-dialog-service';
import { SharedAreaProvider } from '../../../contexts/shared-area';
import { AppDataProvider } from '../../../contexts/app-data/app-data';

import './json-info-view-dialog.scss'

export type JsonInfoViewDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & {
    title: string,
    content: object
};

const JsonInfoViewDialog = (props: JsonInfoViewDialogProps) => {
    const { isXSmall, isSmall } = useScreenSize();

    useEffect(() => {
        const popup = document.querySelector('.dx-loadpanel-wrapper') as HTMLDivElement;
        popup.style.zIndex = (parseInt(popup.style.zIndex) + 1).toString();
    }, []);

    return (props.content ?
        <AppModalPopup
            width={isXSmall || isSmall ? '95%' : '60%'}
            height={isXSmall || isSmall ? '80%' : '450'}
            dragEnabled={!(isXSmall || isSmall)}
            {...props}
            callback={(modalResult) => {
                if (props.callback) {
                    props.callback(modalResult);
                }
            }}

            contentRender={() => {
                return props.content
                    ? <div className='json-popup-container'>
                        <ReactJson
                            src={props.content}
                            collapsed={false}
                            enableClipboard
                            displayDataTypes={true}
                            name={'validationErrors'}
                        />
                    </div>
                    : <div className='dx-datagrid-nodata'>{formatMessage('dxDataGrid-noDataText')}</div>
            }}
        /> : null
    );
}


class JsonInfoViewDialogService extends RootDialogService {
    protected readonly dialogId = 'json-info-view-dialog-root';

    public show({ title, content }: { title: string, content: object }) {
        super.show(() => {
            this.root!.render(
                <SharedAreaProvider>
                    <AppDataProvider>
                        <JsonInfoViewDialog
                            title={title}
                            content={content}
                            callback={() => { }}
                            onHidden={() => { this.hide(); }}
                        />
                    </AppDataProvider>
                </SharedAreaProvider>
            );
        });
    }
}

export const jsonInfoViewService = new JsonInfoViewDialogService();