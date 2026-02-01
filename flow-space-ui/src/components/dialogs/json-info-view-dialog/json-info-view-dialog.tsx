
import { useEffect } from 'react';
import { type AppModalPopupProps } from '../../../models/app-modal-popup-props';
import AppModalPopup from '../app-modal-popup/app-modal-popup';
import type { IPopupOptions } from 'devextreme-react/popup';
import { formatMessage } from 'devextreme/localization';
import { useScreenSize } from '../../../utils/media-query';
import ReactJson from "react-json-view";

import './json-info-view-dialog.scss'

export type JsonInfoViewDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & {
    title: string,
    content: object
};

export const JsonInfoViewDialog = (props: JsonInfoViewDialogProps) => {
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