import { useEffect, useRef } from "react";
import { useDashboardPage } from "../../dashboard-page-context";

export const Mnemoschema = ({ onBeforeMount: onBeforeMount }: { onBeforeMount?: (mnemoschemaElement: HTMLElement) => void }) => {
    const mnemoschemaContainerRef = useRef<HTMLDivElement>(null);
    const { mnemoschema, isValidDeviceState } = useDashboardPage();

    useEffect(() => {
        if (!mnemoschemaContainerRef.current || !mnemoschema) {
            return;
        }

        try {
            const parser = new DOMParser();
            const mnemoschemaDoc = parser.parseFromString(mnemoschema, 'image/svg+xml');
            mnemoschemaContainerRef.current.innerHTML = '';
            if (onBeforeMount) {
                onBeforeMount(mnemoschemaDoc.documentElement);
            }
            mnemoschemaContainerRef.current.appendChild(mnemoschemaDoc.documentElement);
        } catch (error) {
            console.error('Error parsing SVG:', error);
        }
    }, [mnemoschema, onBeforeMount]);

    return (
        <>
            {mnemoschema
                ? <div id="mnemo-schema-wrapper" style={{ display: 'flex', alignItems: 'center', opacity: (isValidDeviceState ? 1 : 1) }} ref={mnemoschemaContainerRef} />
                : null
            }
        </>
    );
}