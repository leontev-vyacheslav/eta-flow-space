import { useRef, useState } from "react";
import type { IPopupOptions } from "devextreme-react/popup";
import { Popup as PopupRef } from "devextreme-react/popup";
import type { AppModalPopupProps } from "../../../models/app-modal-popup-props";
import { useScreenSize } from "../../../utils/media-query";
import AppModalPopup from "../app-modal-popup/app-modal-popup";
import Button from "devextreme-react/button";
import { EmergencySummaryReportParametric } from "./emergency-summary-report-parametric";

const parametricRegister: Record<string, React.FC<{ onParamsChange: (params: any) => void }>> = {
    'emergency-summary': EmergencySummaryReportParametric,
};

export type ReportParamsDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & {
    reportCode: string;
};

export const ReportParametricDialog = (props: ReportParamsDialogProps) => {
    const { isXSmall, isSmall } = useScreenSize();
    const popupRef = useRef<PopupRef>(null);
    const [params, setParams] = useState<any>({});
    const Parametric = parametricRegister[props.reportCode];

    return (
        <AppModalPopup
            ref={popupRef}
            title="Параметры отчёта"
            width={isXSmall || isSmall ? '95%' : 480}
            height={isXSmall || isSmall ? '80%' : undefined}
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
                {Parametric ? (
                    <Parametric onParamsChange={(params) => {
                        setParams(params);
                    }} />
                ) : null}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '20px' }}>
                <Button
                    text="Применить"
                    type="default"
                    onClick={() => {
                        if (props.callback) {
                            props.callback({ modalResult: 'OK', data: params });
                            popupRef.current?.instance.hide();
                        }
                    }}
                />
            </div>
        </AppModalPopup>
    );
}