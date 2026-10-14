import { useCallback } from "react";
import { useScreenSize } from "../../../../utils/media-query";

// the diagram is re-mounted when the screen size class changes, so applying the size on mount follows resizes too
export const useMnemoschemaSize = () => {
    const { isXSmall, isSmall, isLarge } = useScreenSize();

    return useCallback((mnemoschemaElement: HTMLElement) => {
        const height = (isSmall || isXSmall) ? '450px'
            : isLarge ? '540px'
                : '640px';

        mnemoschemaElement.setAttribute('height', height);
        mnemoschemaElement.setAttribute('width', '100%');
        mnemoschemaElement.style.flex = (isSmall || isXSmall) ? '1' : '';
    }, [isXSmall, isSmall, isLarge]);
}
