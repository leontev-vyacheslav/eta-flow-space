import { useCallback } from "react";
import { useParams } from "react-router";
import { useAppData } from "../../../../contexts/app-data/app-data";

export const useMnemoschemaInjectCss = () => {
    const { flowCode } = useParams();
    const { getMnemoschemaStylesheetsAsync } = useAppData();

    return useCallback(async (mnemoschemaElement: HTMLElement | null) => {
        if (!mnemoschemaElement || !flowCode) {
            return;
        }

        let cssModule = null;
        try {
            cssModule = await getMnemoschemaStylesheetsAsync(flowCode);
        } catch (error) {
            console.error(error);
        }

        if (cssModule) {
            const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            style.textContent = cssModule;
            mnemoschemaElement.prepend(style);
        }
    }, [flowCode, getMnemoschemaStylesheetsAsync]);
}