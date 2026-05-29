import { useCallback } from "react";
import { useParams } from "react-router";
import routes from '../../../../constants/app-api-routes';
import { useAppSettings } from "../../../../contexts/app-settings";

export const useMnemoschemaInjectCss = () => {
    const { flowCode } = useParams();
    const { appSettingsData } = useAppSettings();

    return useCallback(async (mnemoschemaElement: HTMLElement | null) => {
        if (!mnemoschemaElement || !flowCode) {
            return;
        }

        let cssModule = null;
        try {
            const manifest = appSettingsData.staticFilesManifest[flowCode];
            const cssModuleRequest = await fetch(`${routes.host}/static/flows/${flowCode}/${flowCode}-mnemo-schema.css?v=${manifest['mnemo-schema'] ?? Date.now()}`);
            cssModule = await cssModuleRequest.text();
        } catch (error) {
            console.error(error);
        }

        if (cssModule) {
            const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            style.textContent = cssModule;
            mnemoschemaElement.prepend(style);
        }
    }, [flowCode, appSettingsData]);
}