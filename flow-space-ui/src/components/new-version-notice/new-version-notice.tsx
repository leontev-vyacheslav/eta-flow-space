import { useEffect, useState } from 'react';
import { Button } from 'devextreme-react/button';
import AppConstants from '../../constants/app-constants';

import './new-version-notice.scss';

const checkIntervalMs = 5 * 60_000;

// every build writes version.json next to index.html (vite.config.ts); a different version there means a new
// deployment, while this tab still runs the old one
async function isNewVersionDeployed(): Promise<boolean> {
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' });
        if (!response.ok) {
            return false;
        }
        const { version } = await response.json();

        return typeof version === 'string' && version !== AppConstants.appInfo.version;
    } catch {
        // offline, or a deployment in progress: the next check tries again
        return false;
    }
}

export const NewVersionNotice = () => {
    const [isShown, setIsShown] = useState(false);

    useEffect(() => {
        // the dev server has no version.json; once shown, the notice stays until the page is reloaded
        if (!import.meta.env.PROD || isShown) {
            return;
        }

        // regularly, and whenever the tab comes back into view: that is when a deployment is most likely missed
        const check = async () => {
            if (document.visibilityState === 'visible' && await isNewVersionDeployed()) {
                setIsShown(true);
            }
        };
        const timer = setInterval(check, checkIntervalMs);
        document.addEventListener('visibilitychange', check);
        window.addEventListener('focus', check);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', check);
            window.removeEventListener('focus', check);
        };
    }, [isShown]);

    return isShown
        ? <div className={'new-version-notice'} role={'status'}>
            <span>Доступна новая версия приложения.</span>
            <Button text={'Обновить'} type={'default'} stylingMode={'contained'} onClick={() => window.location.reload()} />
        </div>
        : null;
};
