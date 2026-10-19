import Markdown, { defaultUrlTransform } from 'react-markdown';
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

const quickHelpContentUrl = `${routes.host}/static/quick-help/content/`;

// /static is cached as immutable, so every help file is requested by its manifest version; a file the manifest
// does not list yet (statics copied without regenerating it) is requested fresh
const versionedUrl = (path: string, manifest: any) =>
    `${quickHelpContentUrl}${path}?v=${manifest?.['quick-help']?.[path] ?? Date.now()}`;

const QuickReferenceHelpDialog = (props: QuickReferenceHelpDialogProps) => {
    const { getQuickHelpReferenceAsync, staticFilesManifest } = useAppData();
    const [quickHelpReference, setQuickHelpReference] = useState<QuickHelpReferenceModel | null>(null);
    const { isXSmall, isSmall } = useScreenSize();

    useEffect(() => {
        if (!staticFilesManifest) {
            return;
        }
        (async () => {
            const quickHelpContent = await fetch(versionedUrl(`${props.referenceKey}.md`, staticFilesManifest)).then(res => res.ok ? res.text() : null);
            if (quickHelpContent) {
                setQuickHelpReference({
                    content: quickHelpContent,
                    key: btoa(props.referenceKey)
                });
            }
        })();
    }, [getQuickHelpReferenceAsync, props.referenceKey, staticFilesManifest]);

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
                        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} skipHtml={false} urlTransform={(url) => {
                            const safeUrl = defaultUrlTransform(url);
                            // a picture next to the article, e.g. images/map.png, is resolved against the article's folder
                            if (!safeUrl || /^([a-z]+:|\/|#)/i.test(safeUrl)) {
                                return safeUrl;
                            }
                            const folder = props.referenceKey.includes('/') ? props.referenceKey.slice(0, props.referenceKey.lastIndexOf('/') + 1) : '';
                            return versionedUrl(new URL(safeUrl, `http://help/${folder}`).pathname.slice(1), staticFilesManifest);
                        }}>
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