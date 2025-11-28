import type { StateModel } from "./models/state-model";
import { ControlForm } from "./control-form";
import { useDashboardPage } from "../../dashboard-page-context";

const ControlTabContent = () => {
    const { device, deviceState } = useDashboardPage();
    console.log(device, deviceState);

    return (
        <ControlForm state={deviceState?.state as StateModel} />
    );
}

export default ControlTabContent;