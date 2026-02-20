import { useEffect } from 'react';

type TransformRef = {
    setTransform: (x: number, y: number, scale: number) => void;
};

export function useMnemoschemaRestoreTransformState(
    flowCode: string | undefined,
    transformComponentRef: React.RefObject<TransformRef | null> ,
    onInitComplete?: () => void,
    delay = 500
) {
    useEffect(() => {
        const timer = setTimeout(() => {
            const savedState = localStorage.getItem(
                `mnemoschemaTransformedState_${flowCode}`
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
        }, delay);

        return () => clearTimeout(timer);
    }, [flowCode, delay, onInitComplete, transformComponentRef]);
}
