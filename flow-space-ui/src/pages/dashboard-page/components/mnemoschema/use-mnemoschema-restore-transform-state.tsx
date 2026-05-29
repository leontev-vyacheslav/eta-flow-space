import { useEffect, useCallback } from 'react';
import { kebabToCamel } from '../../../../utils/string-utils';

type TransformRef = {
    setTransform: (x: number, y: number, scale: number) => void;
};

export function useMnemoschemaRestoreTransformState(
    flowCode: string | undefined,
    transformComponentRef: React.RefObject<TransformRef | null>,
    onInitComplete?: () => void,
    delay = 500
) {
    const restore = useCallback(() => {
        if (flowCode) {
            const savedState = localStorage.getItem(
                `mnemoschemaTransformedState_${kebabToCamel(flowCode)}`
            );
            if (savedState && transformComponentRef?.current) {
                try {
                    const { scale, positionX, positionY } = JSON.parse(savedState);
                    transformComponentRef.current.setTransform(
                        positionX,
                        positionY,
                        scale
                    );
                } catch (e) {
                    console.error('Failed to restore transform state', e);
                }
            }
            onInitComplete?.();
        }

    }, [flowCode, transformComponentRef, onInitComplete]);

    useEffect(() => {
        const timer1 = setTimeout(() => {
            restore();
        }, delay);

        return () => {
            clearTimeout(timer1);
        };
    }, [delay, restore]);
}
