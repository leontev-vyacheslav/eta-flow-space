import { TimeIcon } from '../../constants/app-icons';
import { useAppSettingsStore } from '../../contexts/app-settings-store';
import type { WorkDateWidgetProps } from '../../models/work-date-widget-props';
import { useCallback, useEffect, useState } from 'react';


export const WorkDateWidget = ({ style }: WorkDateWidgetProps) => {
    const workDate = useAppSettingsStore( (s) => s.appSettingsData.workDate);

    const [isShowColon, setIsShowColon] = useState<boolean>(true);

    useEffect(() => {
        const intervalTimer = setInterval(() => {
            setIsShowColon(previous => !previous);
        }, 1000);

        return () => clearInterval(intervalTimer);
    }, []);

    const getFormattedWorkDate = useCallback(() => {
        if (!workDate)
            return null;

        const formattedWorkDate = workDate
            .toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: 'numeric'
            });

        return isShowColon ? formattedWorkDate : formattedWorkDate.replaceAll(':', ' ');
    }, [isShowColon, workDate]);

    return (
        <div style={ {
             ...{
                display: 'flex',

                lineHeight: 'initial',
                alignItems: 'flex-start',
                gap: 5
            }, ...style,
        } }>
            <TimeIcon size={20} />
            <div> {getFormattedWorkDate()}</div>
        </div>
    );
};
