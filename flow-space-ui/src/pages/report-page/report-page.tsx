import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "../../contexts/app-data/app-data";
import PageHeader from "../../components/page-header/page-header";
import { AdditionalMenuIcon, RefreshIcon, ReportIcon, SettingsIcon } from "../../constants/app-icons";
import AppConstants from "../../constants/app-constants";
// import { NoData } from "../../components/no-data-widget/no-data-widget";
import { useParams } from "react-router";
import type { MenuItemModel } from "../../models/menu-item-model";
import { getQuickGuid } from "../../utils/uuid";
import { reportParametricService } from "../../services/report-parametric-service";
import { kebabToCamel } from "../../utils/string-utils";
import { NoData } from "../../components/no-data-widget/no-data-widget";

type ReportDataSourceRegistryItem = {
    description: string;
    initialParams: any;
}

const useDecodedReportUrl = () => {
    const { reportUrl } = useParams<{ reportUrl: string }>();

    const decoded = useMemo(() => {
        if (!reportUrl) return null;

        try {
            return atob(reportUrl);
        } catch (error) {
            console.error('Failed to decode base64 reportUrl:', error);
            return null;
        }
    }, [reportUrl]);

    return decoded;
};

export const ReportPage = () => {
    const { getReportListAsync } = useAppData();
    const reportUrl = useDecodedReportUrl();
    const [reportBlobUrl, setReportBlobUrl] = useState<string | null>(null);
    const [params, setParams] = useState<any>(null);
    const { getReportAsync } = useAppData();
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());
    const [reportDataSourceRegistry, setReportDataSourceRegistry] = useState<Record<string, ReportDataSourceRegistryItem>>({});

    useEffect(() => {
        (async () => {
            const reportList = await getReportListAsync();
            console.log(reportList);

            if (!reportList) {
                return;
            }
            const registry: Record<string, ReportDataSourceRegistryItem> = {};
            reportList.forEach(report => {
                registry[report.url] = {
                    description: report.description,
                    initialParams: { ...report.settings.initialParams, deviceId: report.deviceId },
                };
            });
            setReportDataSourceRegistry(registry);
            console.log(registry);

        })();
    }, [getReportListAsync]);

    useEffect(() => {
        if (!reportUrl) {
            return undefined;
        }

        const registryItem = reportDataSourceRegistry[reportUrl];
        if (!registryItem) {
            return undefined;
        }
        let storedInitialParams = null;
        const storedInitialParamsJson = localStorage.getItem(`reportParams_${kebabToCamel(reportUrl.replaceAll('/', '-'))}`);
        if (storedInitialParamsJson) {
            try {
                storedInitialParams = JSON.parse(storedInitialParamsJson);
            } catch (e) {
                console.error('Error parsing report params from local storage', e);
            }
        }
        setParams(storedInitialParams || registryItem.initialParams);
    }, [reportUrl, reportDataSourceRegistry]);

    const menuItems = useMemo(() => {
        return [
            {
                icon: () => <SettingsIcon size={20} color="black" />,
                onClick: () => {
                    if (!reportUrl) {
                        return;
                    }
                    reportParametricService.show(reportUrl, params, (modalResult) => {
                        if (modalResult.modalResult === 'OK') {
                            setParams(modalResult.data);
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
    }, [params, reportUrl]);

    const getDataSourceAsyncWrapper = useCallback(async () => {
        if (!reportUrl || !params) {
            return undefined;
        }

        return await getReportAsync(reportUrl, params);
    }, [reportUrl, getReportAsync, params]);

    useEffect(() => {
        let url: string | null = null;
        (async () => {
            const blob = await getDataSourceAsyncWrapper();
            if (!blob) {
                return;
            }
            // setTimeout(() => {
            //     const loaderWrapper = document.querySelector('.dx-overlay-wrapper.dx-loadpanel-wrapper');

            //     if (loaderWrapper) {
            //         (loaderWrapper as HTMLDivElement).style.display = 'block'
            //     }
            // }, 200);
            url = URL.createObjectURL(blob);
            setReportBlobUrl(url);

        })();

        return () => {
            if (url) {
                URL.revokeObjectURL(url);
            }

        }
    }, [refreshToken, getDataSourceAsyncWrapper]);


    // const handleIframeLoad = useCallback(() => {
    //     const loaderWrapper = document.querySelector('.dx-overlay-wrapper.dx-loadpanel-wrapper');

    //     if (loaderWrapper) {
    //         (loaderWrapper as HTMLDivElement).style.display = 'none'
    //     }
    // }, []);


    return (
        <>
            <PageHeader caption={() => {
                return <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Отчёт</span>
                    <span style={{ fontSize: 12, fontWeight: 'normal', minHeight: 16, color: 'rgb(118, 118, 118)' }}>
                        {reportUrl ? reportDataSourceRegistry[reportUrl]?.description : ''}
                    </span>
                </div>
            }} menuItems={menuItems} >
                <ReportIcon size={AppConstants.headerIconSize} />
            </PageHeader>

            <div style={{ height: '100%', width: '100%', padding: 5 }}>
                {reportBlobUrl ? <iframe src={reportBlobUrl}
                    style={{
                        width: '100%',
                        height: 'calc(100% - 60px)',
                        border: 'none',
                    }}></iframe>
                    : <NoData />
                }
            </div>
        </>
    );
}