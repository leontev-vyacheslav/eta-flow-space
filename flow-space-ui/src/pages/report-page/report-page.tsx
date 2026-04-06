import { useCallback, useEffect, useState } from "react";
import { useAppData } from "../../contexts/app-data/app-data";
import PageHeader from "../../components/page-header/page-header";
import { ReportIcon } from "../../constants/app-icons";
import AppConstants from "../../constants/app-constants";
import { NoData } from "../../components/no-data-widget/no-data-widget";

export const ReportPage = () => {
    const { getEmergencySummaryAsync } = useAppData();
    const [reportUrl, setReportUrl] = useState<string | null>(null);

    const getEmergencySummaryAsyncWrapper = useCallback(async () => {
        return await getEmergencySummaryAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let url: string | null = null;
        (async () => {
            const blob = await getEmergencySummaryAsyncWrapper();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <PageHeader caption={'Отчет'} >
                <ReportIcon size={AppConstants.headerIconSize} />
            </PageHeader>
            <div style={{ height: '100%', width: '100%', paddingTop: 10 }}>
                {reportUrl ? <iframe src={reportUrl}
                    style={{
                        width: '100%',
                        height: 'calc(100% - 50px)',
                        border: 'none',
                    }}></iframe>
                    : <NoData />}
            </div>
        </>
    );
}