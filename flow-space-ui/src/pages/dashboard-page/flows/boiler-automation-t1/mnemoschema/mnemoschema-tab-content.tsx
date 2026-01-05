import { Mnemoschema } from "../../../components/mnemoschema/mnemoschema";
import { useScreenSize } from "../../../../../utils/media-query";

const MnemoschemaTabContent = () => {
    const { isSmall, isXSmall, isLarge } = useScreenSize();

    return (
        <>
            <Mnemoschema onBeforeMount={(mnemoschemaElement: HTMLElement) => {
                mnemoschemaElement.setAttribute("height", isSmall || isXSmall ? '450px' : isLarge ? '540px' : '640px');
                if (isSmall || isXSmall) {
                    mnemoschemaElement.style.flex = '1';
                }
            }}  />
        </>
    );
}

export default MnemoschemaTabContent;