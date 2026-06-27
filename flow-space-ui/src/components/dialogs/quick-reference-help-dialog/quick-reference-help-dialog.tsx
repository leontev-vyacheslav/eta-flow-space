import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { useEffect, useState } from 'react';
import { type AppModalPopupProps } from '../../../models/app-modal-popup-props';
import AppModalPopup from '../app-modal-popup/app-modal-popup';
import type { IPopupOptions } from 'devextreme-react/popup';
import { AppDataProvider, useAppData } from '../../../contexts/app-data/app-data';
import type { QuickHelpReferenceModel } from '../../../models/quick-help-reference-model';
import { formatMessage } from 'devextreme/localization';
import { useScreenSize } from '../../../utils/media-query';
import routes from "../../../constants/app-api-routes";
import { SharedAreaProvider } from '../../../contexts/shared-area';
import { RootDialogService } from '../root-dialog-service';

import './quick-reference-help-dialog.scss'

export type QuickReferenceHelpDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & {
    referenceKey: string
};

const QuickReferenceHelpDialog = (props: QuickReferenceHelpDialogProps) => {
    const { getQuickHelpReferenceAsync } = useAppData();
    const [quickHelpReference, setQuickHelpReference] = useState<QuickHelpReferenceModel | null>(null);
    const { isXSmall, isSmall } = useScreenSize();

    useEffect(() => {
        (async () => {
            const quickHelpContent = await fetch(`${routes.host}/static/quick-help/content/${props.referenceKey}.md`).then(res => res.ok ? res.text() : null);
            if (quickHelpContent) {
                setQuickHelpReference({
                    content: quickHelpContent,
                    key: btoa(props.referenceKey)
                });
            }
        })();
    }, [getQuickHelpReferenceAsync, props.referenceKey]);

    useEffect(() => {
        const popup = document.querySelector('.dx-loadpanel-wrapper') as HTMLDivElement;
        popup.style.zIndex = (parseInt(popup.style.zIndex) + 1).toString();
    }, []);

    return (quickHelpReference ?
        <AppModalPopup
            title='Краткая справка'
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
                return quickHelpReference && quickHelpReference.content
                    ? <div className='quick-help-reference-container'>
                        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} skipHtml={false} >
                            {quickHelpReference?.content}
                        </Markdown>
                    </div>
                    : <div className='dx-datagrid-nodata'>{formatMessage('dxDataGrid-noDataText')}</div>
            }}
        /> : null
    );
}


class QuickHelpReferenceDialogService extends RootDialogService {
    protected readonly dialogId: string = 'quick-help-reference-dialog-root';

    public show({ referenceKey }: { referenceKey: string }) {
        super.show(() => {
            this.root!.render(
                <SharedAreaProvider>
                    <AppDataProvider>
                        <QuickReferenceHelpDialog
                            referenceKey={referenceKey}
                            callback={() => { }}
                            onHidden={() => { this.hide(); }}
                        />
                    </AppDataProvider>
                </SharedAreaProvider>
            );
        })

    }

    public hide() {
        if (this.root) {
            this.root!.unmount();
        }
        if (this.popupContainer) {
            this.popupContainer.remove();
        }
    }
}

export const quickHelpReferenceService = new QuickHelpReferenceDialogService();