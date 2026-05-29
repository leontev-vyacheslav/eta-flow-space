import { useEffect, useMemo, useRef, useState } from "react";
import type { IPopupOptions } from "devextreme-react/popup";
import { Popup as PopupRef } from "devextreme-react/popup";
import type { AppModalPopupProps } from "../../../models/app-modal-popup-props";
import { useScreenSize } from "../../../utils/media-query";
import AppModalPopup from "../app-modal-popup/app-modal-popup";
import Button from "devextreme-react/button";
import type { ReportModel } from "../../../models/flows/report-model";
import { ReportParametric } from "./report-parametric";
import type { ParameterModel } from "../../../models/flows/parameter-model";
import { useAppData } from "../../../contexts/app-data/app-data";

export type ReportParamsDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & {
    report: ReportModel;
    parameterValues: any;
};

export const ReportParametricDialog = (props: ReportParamsDialogProps) => {
    const { isXSmall, isSmall } = useScreenSize();
    const popupRef = useRef<PopupRef>(null);
    const [parameterValues, setParameterValues] = useState<any>();
    const [parameters, setParameters] = useState<ParameterModel[]>();
    const { getDeviceListAsync } = useAppData();

    const datasourceRegistry: Record<string, () => Promise<any>> = useMemo(() => ({
        'getDeviceListAsync': async () => await getDeviceListAsync(),
    }), [getDeviceListAsync]);

    useEffect(() => {
        (async () => {
            for (const p of props.report.settings.parameters) {
                if (p.dataSource && p.dataSource.type === 'endpoint' && datasourceRegistry[p.dataSource.name]) {
                    const data = await datasourceRegistry[p.dataSource.name]();
                    if (data) {
                        p.ui.editorOptions = { ...p.ui.editorOptions, items: data };
                        if (p.dataSource.items) {
                            p.ui.editorOptions.items = [...p.ui.editorOptions.items, ...p.dataSource.items].sort((a: any, b: any) => a.id - b.id);
                        }
                    }
                }
            }
            setParameters([...props.report.settings.parameters]);
        })();

    }, [props.report, datasourceRegistry]);

    return parameters ?
        <AppModalPopup
            ref={popupRef}
            title="Параметры отчёта"
            width={isXSmall || isSmall ? '95%' : 480}
            height={isXSmall || isSmall ? '80%' : 'auto'}
            dragEnabled={!(isXSmall || isSmall)}
            hideOnOutsideClick
            {...props}
            callback={(modalCallbackProps) => {
                if (props.callback) {
                    modalCallbackProps.modalResult = 'CANCEL';
                    props.callback(modalCallbackProps);
                }
            }}
        >
            <div style={{ padding: '20px', paddingTop: 0 }}>
                <ReportParametric parameters={parameters} parameterValues={props.parameterValues} onParameterValuesChange={(values) => {
                    setParameterValues(values);
                }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '20px' }}>
                <Button
                    text="Применить"
                    type="default"
                    onClick={() => {
                        if (props.callback) {
                            props.callback({ modalResult: 'OK', data: parameterValues });
                            // store params in local storage
                            localStorage.setItem(`reportParams_${props.report.id}`, JSON.stringify(parameterValues));
                            popupRef.current?.instance.hide();
                        }
                    }}
                />
            </div>
        </AppModalPopup>
        : null;
}