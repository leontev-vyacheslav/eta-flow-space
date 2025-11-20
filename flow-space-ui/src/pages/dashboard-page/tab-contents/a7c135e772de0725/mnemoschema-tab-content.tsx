import { useEffect, useRef } from "react";
import type { DeviceStateModel } from "../../../../models/flows/device-state-model";
import { useScreenSize } from "../../../../utils/media-query";

const MnemoschemaTabContent = ({ flowUid, deviceState, mnemoschema }: { flowUid: string, deviceState: DeviceStateModel, mnemoschema: string }) => {
    const mnemoschemaContainerRef = useRef<HTMLDivElement>(null);
    const { isSmall, isXSmall, isLarge } = useScreenSize();

    useEffect(() => {
        if (!mnemoschemaContainerRef.current || !mnemoschema) return;

        try {
            const parser = new DOMParser();
            const mnemoschemaDoc = parser.parseFromString(mnemoschema, 'image/svg+xml');
            mnemoschemaContainerRef.current.innerHTML = '';
            const svgElement = mnemoschemaContainerRef.current.appendChild(mnemoschemaDoc.documentElement);
            svgElement.setAttribute('height', isSmall || isXSmall ? '450px' : isLarge ? '520px' : '640px');
            if (isSmall || isXSmall) {
                svgElement.style.flex = '1';
            }
        } catch (error) {
            console.error('Error parsing SVG:', error);
        }
    }, [isLarge, isSmall, isXSmall, mnemoschema]);

    return (
        <>
            {mnemoschema
                ? <div style={{ display: 'flex', alignItems: 'center' }} ref={mnemoschemaContainerRef} />
                : null}
        </>
    );
}

export default MnemoschemaTabContent;