import { Mnemoschema } from "../../../components/mnemoschema/mnemoschema";
import { useScreenSize } from "../../../../../utils/media-query";
import { useCallback } from "react";



const MnemoschemaTabContent = () => {
    const { isSmall, isXSmall, isLarge } = useScreenSize();

    const onBeforeMountHandler = useCallback((mnemoschemaElement: HTMLElement) => {
        mnemoschemaElement.setAttribute("height", isSmall || isXSmall ? '450px' : isLarge ? '540px' : '640px');
        mnemoschemaElement.setAttribute("width", '100%');
        if (isSmall || isXSmall) {
            mnemoschemaElement.style.flex = '1';
        }
    }, [isLarge, isSmall, isXSmall]);

    return (
        <Mnemoschema onBeforeMount={onBeforeMountHandler} />
    );
}

export default MnemoschemaTabContent;