import type { IPopupOptions } from 'devextreme-react/popup';
import { useEffect, useState } from 'react';
import { AppDataProvider, useAppData } from '../../../contexts/app-data/app-data';
import { SharedAreaProvider } from '../../../contexts/shared-area';
import { useScreenSize } from '../../../utils/media-query';
import AppModalPopup from '../app-modal-popup/app-modal-popup';
import { RootDialogService } from '../root-dialog-service';

type WeatherForecastDialogParams = { objectLocationId: number };

const WeatherForecastDialog = ({ objectLocationId, ...props }: Pick<IPopupOptions, 'onHidden'> & WeatherForecastDialogParams) => {
    const { getWeatherForecastAsync } = useAppData();
    const { isXSmall, isSmall } = useScreenSize();
    const isCompact = isXSmall || isSmall;
    const [dialogSize, setDialogSize] = useState<Pick<IPopupOptions, 'width' | 'height'>>({
        width: '80%',
        height: '80%'
    });

    useEffect(() => {
        let cancelled = false;

        getWeatherForecastAsync(objectLocationId).then(forecast => {
            if (!cancelled && forecast) {
                console.log('Weather forecast:', forecast);
            }
        });

        return () => { cancelled = true; };
    }, [getWeatherForecastAsync, objectLocationId]);

    return (
        <AppModalPopup
            title='Прогноз погоды'
            width={isCompact ? '95%' : dialogSize.width}
            height={isCompact ? '80%' : dialogSize.height}
            dragEnabled={!isCompact}
            resizeEnabled={!isCompact}
            onWidthChange={(width) => {
                setDialogSize(size => ({ ...size, width }));
            }}
            onHeightChange={(height) => {
                setDialogSize(size => ({ ...size, height }));
            }}
            hideOnOutsideClick
            {...props}
        />
    );
};

class WeatherForecastDialogService extends RootDialogService {
    protected readonly dialogId: string = 'weather-forecast-dialog-root';

    public show(params: WeatherForecastDialogParams) {
        super.show(() => {
            this.root!.render(
                <SharedAreaProvider>
                    <AppDataProvider>
                        <WeatherForecastDialog {...params} onHidden={() => { this.hide(); }} />
                    </AppDataProvider>
                </SharedAreaProvider>
            );
        });
    }
}

export const weatherForecastService = new WeatherForecastDialogService();
