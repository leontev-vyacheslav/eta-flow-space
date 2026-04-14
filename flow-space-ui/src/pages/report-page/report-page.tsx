import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppData } from "../../contexts/app-data/app-data";
import PageHeader from "../../components/page-header/page-header";
import { AdditionalMenuIcon, RefreshIcon, ReportIcon, SettingsIcon } from "../../constants/app-icons";
import AppConstants from "../../constants/app-constants";
import { NoData } from "../../components/no-data-widget/no-data-widget";
import { useParams } from "react-router";
import type { MenuItemModel } from "../../models/menu-item-model";
import { getQuickGuid } from "../../utils/uuid";
import { reportParametricService } from "../../services/report-parametric-service";

type ReportDataSourceRegistryItem = {
    description: string;
    initialParams: any;
    getDataAsync: (params: any) => Promise<Blob | undefined>;
}

export const ReportPage = () => {
    const { reportCode } = useParams();
    const [reportUrl, setReportUrl] = useState<string | null>(null);
    const { getEmergencySummaryReportAsync } = useAppData();
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());

    const reportDataSourceRegistry: Record<string, ReportDataSourceRegistryItem> = useMemo(() => {
        return {
            'emergency-summary': {
                description: 'Сводный отчёт по нештатным ситуациям', initialParams: {
                    periodType: 'month',
                    deviceId: undefined,
                }, getDataAsync: (params: any) => getEmergencySummaryReportAsync(params)
            },
        };
    }, [getEmergencySummaryReportAsync]);

    const [params, setParams] = useState<any>(() => {
        if (!reportCode) {
            return undefined;
        }
        const registryItem = reportDataSourceRegistry[reportCode];
        if (!registryItem) {
            return undefined;
        }
        return registryItem.initialParams;
    });

    const menuItems = useMemo(() => {
        return [
            {
                icon: () => <SettingsIcon size={20} color="black" />,
                onClick: () => {
                    if (!reportCode) {
                        return;
                    }
                    reportParametricService.show(reportCode, params, (modalResult) => {
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
    }, [params, reportCode]);

    const getDataSourceAsyncWrapper = useCallback(async () => {
        if (!reportCode) {
            return undefined;
        }

        return await reportDataSourceRegistry[reportCode]?.getDataAsync(params);
    }, [reportCode, reportDataSourceRegistry, params]);

    useEffect(() => {
        let url: string | null = null;
        (async () => {
            const blob = await getDataSourceAsyncWrapper();
            if (!blob) {
                return;
            }
            url = URL.createObjectURL(blob);
            setReportUrl(url);
        })();

        return () => {
            if (url) {
                URL.revokeObjectURL(url);
            }
        }
    }, [refreshToken, getDataSourceAsyncWrapper]);

    return (
        <>
            <PageHeader caption={() => {
                return <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Отчёт</span>
                    <span style={{ fontSize: 12, fontWeight: 'normal', minHeight: 16, color: 'rgb(118, 118, 118)' }}>
                        {reportCode ? reportDataSourceRegistry[reportCode]?.description : ''}
                    </span>
                </div>
            }} menuItems={menuItems} >
                <ReportIcon size={AppConstants.headerIconSize} />
            </PageHeader>
            <div style={{ height: '100%', width: '100%', padding: 5 }}>
                {reportUrl ? <iframe src={reportUrl}
                    style={{
                        width: '100%',
                        height: 'calc(100% - 60px)',
                        border: 'none',
                    }}></iframe>
                    : <NoData />}
            </div>

        </>
    );
}