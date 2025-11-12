import { useAppSettings } from '../../contexts/app-settings';
import type { WorkDateWidgetProps } from '../../models/work-date-widget-props';
import { useCallback, useEffect, useState } from 'react';


export const WorkDateWidget = ({ style }: WorkDateWidgetProps) => {
    const { appSettingsData } = useAppSettings();
    const [isShowColon, setIsShowColon] = useState<boolean>(true);

    useEffect(() => {
        const intervalTimer = setInterval(() => {
            setIsShowColon(previous => !previous);
        }, 1000);

        return () => clearInterval(intervalTimer);
    }, []);

    const getFormattedWorkDate = useCallback(() => {
        if (!appSettingsData.workDate)
            return null;

        const formattedWorkDate = appSettingsData
            .workDate
            .toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: 'numeric'
            });

        return isShowColon ? formattedWorkDate : formattedWorkDate.replaceAll(':', ' ');
    }, [appSettingsData.workDate, isShowColon]);

    return (
        <div style={ {
             ...{
                display: 'flex',
                flexDirection: 'column',
                lineHeight: 'initial',
                alignItems: 'flex-start'
            }, ...style,
        } }>
            <div> {getFormattedWorkDate()}</div>
        </div>
    );
};
