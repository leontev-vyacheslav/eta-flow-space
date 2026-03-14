import { useCallback, useEffect, useState } from "react";
import { MainMenu } from "../../components/menu/main-menu/main-menu";
import { EmergencySoundMute, WarningLogIcon, EmergencySoundUnmute, AdditionalMenuIcon } from "../../constants/app-icons";
import { emergencyMuteManager } from "../../services/emergency-mute-manager";
import type dxPopover from "devextreme/ui/popover";
import type { EmergencyModel } from "../../models/flows/emergency-model";
import { IoFlashOutline } from "react-icons/io5";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const EmergencyPopoverContent = ({ emergencyState, popoverInstance }: { emergencyState: EmergencyModel, popoverInstance: React.RefObject<dxPopover<any> | null> }) => {
    const [unmutedEmergencies, setUnmutedEmergencies] = useState<EmergencyModel[]>([]);

    const MenuRender = useCallback(({ deviceId, emergencyReason }: { deviceId: number, emergencyReason: any }) => {
        return (
            <MainMenu disabled={false} items={[
                {
                    icon: () => <AdditionalMenuIcon size={18} color='black' />,
                    items: [
                        {
                            text: "Включить",
                            icon: () => <EmergencySoundUnmute size={18} />,
                            onClick: () => {
                                emergencyMuteManager.removeMute(deviceId, emergencyReason.id);
                                setUnmutedEmergencies(emergencyMuteManager.getUnmutedEmergencies([emergencyState]));
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
                                setUnmutedEmergencies(emergencyMuteManager.getUnmutedEmergencies([emergencyState]));
                            }
                        },

                    ]
                }
            ]} />
        );
    }, [emergencyState]);

    useEffect(() => {
        setUnmutedEmergencies(emergencyMuteManager.getUnmutedEmergencies([emergencyState]));
    }, [emergencyState]);

    return (
        <table className='simple-grid'>
            <thead>
                <tr><th colSpan={2}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <WarningLogIcon size={20} />
                        <span style={{ flex: 1 }}>Нештатные / аварийные ситуации</span>
                    </div>
                </th></tr>
            </thead>
            <tbody>
                {
                    (emergencyState.reasons).map(
                        (r, i: number) =>
                            <tr key={i}>
                                <td style={{ width: 0 }}>
                                    {
                                        unmutedEmergencies.length > 0 && unmutedEmergencies.find(() => true)!.reasons.some((unmutedReason) => unmutedReason.id === r.id)
                                            ? <EmergencySoundUnmute size={16} />
                                            : <EmergencySoundMute size={16} />
                                    }
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

                                            <span style={{ flex: 1, fontSize: '1em' }}>{r.description}</span>
                                    
                                            <span style={{ color: 'gray', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <IoFlashOutline size={12} />
                                                {emergencyState.timestamp && new Date(emergencyState.timestamp).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>

                                            {emergencyMuteManager.getReason(emergencyState.deviceId, r.id)?.time
                                                ? <span style={{ color: 'gray', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <EmergencySoundUnmute size={12} />
                                                    {new Date(emergencyMuteManager.getReason(emergencyState.deviceId, r.id)!.time).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                                                </span>
                                                : null
                                            }
                                        </div>
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