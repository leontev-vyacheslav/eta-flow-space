import { useCallback } from "react";
import { MainMenu } from "../../components/menu/main-menu/main-menu";
import { EmergencySoundMute, WarningLogIcon, EmergencySoundUnmute, AdditionalMenuIcon } from "../../constants/app-icons";
import { emergencyMuteManager } from "../../services/emergency-mute-manager";
import type dxPopover from "devextreme/ui/popover";

export const EmergencyPopoverContent = ({ emergencyState, popoverInstance }: { emergencyState: any, popoverInstance: React.RefObject<dxPopover<any> | null> }) => {

    const MenuRender = useCallback(({ deviceId, emergencyReason }: { deviceId: number, emergencyReason: any }) => {
        return (
            <MainMenu disabled={false} items={[
                {
                    icon: () => <AdditionalMenuIcon size={18} color='black' />,
                    items: [
                        {
                            text: "Включить звук",
                            icon: () => <EmergencySoundUnmute size={18} />,
                            onClick: () => {
                                emergencyMuteManager.removeMute(deviceId, emergencyReason.id);
                                popoverInstance.current?.hide();
                                popoverInstance.current?.dispose();
                            }
                        },
                        {
                            text: 'Выключить на 1 час',
                            icon: () => <EmergencySoundMute size={18} />,
                            onClick: () => {
                                emergencyMuteManager.addMute(
                                    deviceId,
                                    emergencyReason.id,
                                    3600000
                                );
                                popoverInstance.current?.hide();
                                popoverInstance.current?.dispose();
                            }
                        },
                        {
                            text: 'Выключить на 2 часа',
                            icon: () => <EmergencySoundMute size={18} />,
                            onClick: () => {
                                emergencyMuteManager.addMute(
                                    deviceId,
                                    emergencyReason.id,
                                    7200000
                                );
                                popoverInstance.current?.hide();
                                popoverInstance.current?.dispose();
                            }
                        },
                        {
                            text: 'Выключить на 3 часа',
                            icon: () => <EmergencySoundMute size={18} />,
                            onClick: () => {
                                emergencyMuteManager.addMute(
                                    deviceId,
                                    emergencyReason.id,
                                    10800000
                                );
                                popoverInstance.current?.hide();
                                popoverInstance.current?.dispose();
                            }
                        }
                    ]
                }
            ]} />
        );
    }, [popoverInstance]);

    return (
        <table className='simple-grid'>
            <thead>
                <tr><th colSpan={2}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ flex: 1 }}>Нештатные / аварийные ситуации</span>
                        <WarningLogIcon size={20} />
                    </div>
                </th></tr>
            </thead>
            <tbody>
                {
                    (emergencyState.reasons as any[]).map(
                        (r: any, i: number) =>
                            <tr key={i}>
                                <td style={{ width: 0 }}>{i + 1}.</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ flex: 1 }}>{r.description}</span>
                                        <span>
                                            <MenuRender deviceId={emergencyState.deviceId} emergencyReason={r} />
                                        </span>
                                    </div>
                                </td>
                            </tr>
                    )
                }
            </tbody>
        </table>
    );
}