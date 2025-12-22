
import { useDashboardPage } from "../../../dashboard-page-context";
import { Mnemoschema } from "../../../components/mnemoschema/mnemoschema";
import { useCallback, useEffect } from "react";

const MnemoschemaTabContent = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deviceState } = useDashboardPage();

    const stateSetupHandler = useCallback(() => {
        const dataStateAttrs = document.querySelectorAll("svg [data-state]");
        console.log(dataStateAttrs);
    }, []);

    useEffect(() => {
        stateSetupHandler();
    }, [stateSetupHandler]);

    return (
        <>
            <Mnemoschema />
        </>
    );
}

export default MnemoschemaTabContent;