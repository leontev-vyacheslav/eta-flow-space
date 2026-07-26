import { useCallback } from "react";
import { useAppData } from "../../../../contexts/app-data/app-data";
import { useDashboardPage } from "../../dashboard-page-context";

export const useMnemoschemaInjectCss = () => {
    const { getMnemoschemaStylesheetsAsync } = useAppData();
    const { device } = useDashboardPage();

    return useCallback(async (mnemoschemaElement: HTMLElement | null) => {
        if (!mnemoschemaElement || !device) {
            return;
        }

        let cssModule = null;
        try {
            cssModule = await getMnemoschemaStylesheetsAsync(device.code);
        } catch (error) {
            console.error(error);
        }

        if (cssModule) {
            const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            style.textContent = cssModule;
            mnemoschemaElement.prepend(style);
        }
    }, [device, getMnemoschemaStylesheetsAsync]);
}