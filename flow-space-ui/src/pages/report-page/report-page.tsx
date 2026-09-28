import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../../contexts/app-data/app-data";
import PageHeader from "../../components/page-header/page-header";
import { AdditionalMenuIcon, RefreshIcon, ReportIcon, SettingsIcon } from "../../constants/app-icons";
import AppConstants from "../../constants/app-constants";
import { useParams } from "react-router";
import type { MenuItemModel } from "../../models/menu-item-model";
import { getQuickGuid } from "../../utils/uuid";
import { NoData } from "../../components/no-data-widget/no-data-widget";
import type { ReportModel } from "../../models/flows/report-model";
import { useSharedArea } from "../../contexts/shared-area";
import { reportParametricService } from "../../components/dialogs/report-parametric-dialog/report-parametric-dialog";

export const ReportPage = () => {
    const { reportId } = useParams<{ reportId: string }>();
    const { getReportDefinitionAsync, getReportAsync } = useAppData();
    const { showLoader, hideLoader } = useSharedArea();
    const [reportBlobUrl, setReportBlobUrl] = useState<string | null>(null);
    const [reportParameterValues, setReportParameterValues] = useState<any>();
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());
    const [reportDefinition, setReportDefinition] = useState<ReportModel>();

    const menuItems = useMemo(() => {
        return [
            {
                icon: () => <SettingsIcon size={20} color="black" />,
                onClick: () => {
                    if (!reportDefinition) {
                        return;
                    }

                    reportParametricService.show({
                        report: reportDefinition,
                        parameterValues: reportParameterValues,
                        callback: (modalResult) => {
                            if (modalResult.modalResult === 'OK') {
                                setReportParameterValues(modalResult.data);
                            }
                        }
                    });
                }
            },
            {
                icon: () => <AdditionalMenuIcon size={20} color='black' />,
                items: [
                    {
                        icon: () => <RefreshIcon size={20} />,
                        text: 'Обновить...',
                        onClick: () => {
                            setRefreshToken(getQuickGuid());
                        }
                    },
                ]
            }
        ] as MenuItemModel[];
    }, [reportDefinition, reportParameterValues]);

    useEffect(() => {
        (async () => {
            if (!reportId || isNaN(Number(reportId))) {
                return;
            }
            const reportDefinition = await getReportDefinitionAsync(Number(reportId));

            if (!reportDefinition) {
                return;
            }

            let storedInitialParams = null;
            const storedInitialParamsJson = localStorage.getItem(`reportParams_${reportDefinition.id}`);
            if (storedInitialParamsJson) {
                try {
                    storedInitialParams = JSON.parse(storedInitialParamsJson);
                } catch (e) {
                    console.error('Error parsing report params from local storage', e);
                }
            }

            setReportDefinition(reportDefinition);
            setReportParameterValues(storedInitialParams || { ...reportDefinition.settings.initialParams });
        })();
    }, [getReportDefinitionAsync, reportId]);

    useEffect(() => {
        let url: string | null = null;
        let cancelled = false;
        let finished = false;
        // show the loader only for slow reports; the timer is cancelled when loading ends,
        // otherwise a fast reply would hide the loader before it is shown and leave it stuck
        let showLoaderTimer: ReturnType<typeof setTimeout> | undefined;

        (async () => {
            if (!reportDefinition || !reportParameterValues) {
                return;
            }
            try {
                showLoaderTimer = setTimeout(showLoader, 200);
                const blob = await getReportAsync(reportDefinition.url, reportParameterValues);
                // a newer report (other id or parameters) was requested meanwhile: drop this reply
                if (!blob || cancelled) {
                    return;
                }
                url = URL.createObjectURL(blob);
                setReportBlobUrl(url);
            } finally {
                finished = true;
                clearTimeout(showLoaderTimer);
                if (!cancelled) {
                    hideLoader();
                }
            }
        })();

        return () => {
            cancelled = true;
            if (!finished) {
                clearTimeout(showLoaderTimer);
                hideLoader();
            }
            if (url) {
                URL.revokeObjectURL(url);
            }
        }
    }, [refreshToken, reportDefinition, reportParameterValues, getReportAsync, showLoader, hideLoader]);

    return (
        <>
            <PageHeader caption={() => {
                return <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Отчёт</span>
                    <span style={{ fontSize: 12, fontWeight: 'normal', minHeight: 16, color: 'rgb(118, 118, 118)' }}>
                        {reportDefinition ? reportDefinition.description : ''}
                    </span>
                </div>
            }} menuItems={menuItems} >
                <ReportIcon size={AppConstants.headerIconSize} />
            </PageHeader>

            <div style={{ height: '100%', width: '100%', padding: 5 }}>
                {reportBlobUrl ? <iframe src={reportBlobUrl}
                    style={{
                        width: '100%',
                        height: 'calc(100vh - 150px)',
                        border: 'none',
                    }}></iframe>
                    : <NoData />
                }
            </div>
        </>
    );
}