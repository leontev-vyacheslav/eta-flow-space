import { useCallback, useEffect, useState } from "react";
import { MainMenu } from "../components/menu/main-menu/main-menu";
import { EmergencySoundMute, WarningLogIcon, EmergencySoundUnmute, AdditionalMenuIcon, EmergencyWarningOff, EmergencyWarning, EmergencySoundMuteForever } from "../constants/app-icons";
import { emergencyMuteManager } from "../services/emergency-mute-manager";
import type dxPopover from "devextreme/ui/popover";
import type { EmergencyModel } from "../models/flows/emergency-model";
import { IoFlashOutline } from "react-icons/io5";
import { renderToStaticMarkup } from "react-dom/server";
import AppConstants from "../constants/app-constants";
import type { EmergencyReasonModel } from "../models/flows/emergency-reason-model";
import { selectIsAdmin } from "./auth-selectors";
import { useAuthStore } from "./auth-store";

// the mute menu of the alarm popover, for all reasons of a device (header) or for one reason (row). Declared here,
// outside the popover: a component created during render would be a new component type on every change of its
// dependencies, and React would replace it, closing an open submenu
const EmergencyMuteMenu = ({ deviceId, emergencyReasons, onMuteChanged }: {
    deviceId: number,
    emergencyReasons: EmergencyReasonModel[],
    onMuteChanged: () => void,
}) => {
    return (
        <MainMenu disabled={false} items={[
            {
                icon: () => <AdditionalMenuIcon size={18} color='black' />,
                items: [
                    {
                        text: "Включить",
                        icon: () => <EmergencySoundUnmute size={18} />,
                        onClick: () => {
                            for (const reason of emergencyReasons) {
                                emergencyMuteManager.removeMute(deviceId, reason.id);
                            }
                            onMuteChanged();
                        }
                    },
                    {
                        text: 'На 1 час',
                        textFontWeight: emergencyReasons.every(reason => emergencyMuteManager.getReason(deviceId, reason.id)?.duration === emergencyMuteManager.oneHour) ? 'bold' : undefined,
                        icon: () => <EmergencySoundMute size={18} />,
                        onClick: () => {
                            for (const reason of emergencyReasons) {
                                emergencyMuteManager.addMute(deviceId, reason.id, emergencyMuteManager.oneHour);
                            }
                            onMuteChanged();
                        }
                    },
                    {
                        text: 'До устранения',
                        textFontWeight: emergencyReasons.every(reason => emergencyMuteManager.getReason(deviceId, reason.id)?.duration === emergencyMuteManager.oneYear) ? 'bold' : undefined,
                        icon: () => <EmergencySoundMuteForever size={18} />,
                        onClick: () => {
                            for (const reason of emergencyReasons) {
                                emergencyMuteManager.addMute(deviceId, reason.id, emergencyMuteManager.oneYear);
                            }
                            onMuteChanged();
                        }
                    },
                ]
            }
        ]} />
    );
};

export const EmergencyPopoverContent = ({ emergencyState }: { emergencyState: EmergencyModel, popoverInstance: React.RefObject<dxPopover<any> | null> }) => {
    const isAdmin = useAuthStore(selectIsAdmin);
    const [unmutedEmergencies, setUnmutedEmergencies] = useState<EmergencyModel[]>([]);

    const toggleEmergencyIcon = useCallback((deviceId: number) => {
        const emergencyIconContainerElements = document.querySelectorAll(`[data-emergency-icon-container="${deviceId}"]`);
        for (const emergencyIconContainerElement of emergencyIconContainerElements) {
            if (!emergencyIconContainerElement) {
                return;
            }

            const isDeviceMuted = emergencyMuteManager.isDeviceMuted(emergencyState);
            const isConnected = emergencyState.reasons.some(r => r.id === AppConstants.connectedEmergencyReasonId);

            const emergencyMutedIcon = renderToStaticMarkup(
                isDeviceMuted
                    ? <EmergencyWarningOff data-emergency-mute-icon size={12} style={{ fill: isConnected ? AppConstants.colors.emergencyCriticalColor : AppConstants.colors.emergencyWarningColor, cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }} />
                    : <EmergencyWarning data-emergency-mute-icon size={12} style={{ fill: isConnected ? AppConstants.colors.emergencyCriticalColor : AppConstants.colors.emergencyWarningColor, cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }} />
            );

            const iconElement = emergencyIconContainerElement.querySelector('[data-emergency-mute-icon]');
            if (iconElement) {
                iconElement!.remove();
                emergencyIconContainerElement.append(new DOMParser().parseFromString(emergencyMutedIcon, 'image/svg+xml').documentElement);
            }
        }

    }, [emergencyState]);

    // a mute menu changed the mute state: the popover's sound icons and the alarm icon in the side menu follow
    const muteChanged = useCallback(() => {
        setUnmutedEmergencies(emergencyMuteManager.getUnmutedEmergencies([emergencyState]));
        toggleEmergencyIcon(emergencyState.deviceId);
    }, [emergencyState, toggleEmergencyIcon]);

    useEffect(() => {
        setUnmutedEmergencies(emergencyMuteManager.getUnmutedEmergencies([emergencyState]));
    }, [emergencyState]);

    return (
        <>
            <table className='simple-grid'>
                <thead>
                    <tr><th colSpan={2}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <WarningLogIcon size={20} />
                            <span style={{ flex: 1, position: 'relative' }}>Нештатные / аварийные ситуации
                                <span style={{ position: 'absolute', top: '-10px', right: '-10px', background: AppConstants.colors.baseDarkgreyTextColor, borderRadius: '50%', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px' }}>{emergencyState.reasons.length}</span>
                            </span>
                            <span style={{ paddingLeft: 10 }}>
                                <EmergencyMuteMenu deviceId={emergencyState.deviceId} emergencyReasons={emergencyState.reasons} onMuteChanged={muteChanged} />
                            </span>
                        </div>

                    </th></tr>
                </thead>
            </table>
            <div className="simple-grid-body-scroller" style={{ overflowY: 'auto', maxHeight: '200px' }}>
                <table className='simple-grid'>
                    <tbody>
                        {
                            (emergencyState.reasons).map(
                                (r, i: number) => {
                                    const muteReason = emergencyMuteManager.getReason(emergencyState.deviceId, r.id);

                                    return (<tr key={i}>
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
                                                    <span style={{ flex: 1, fontSize: '1em' }}>{r.description}{isAdmin && ` [${r.id}]`}</span>
                                                    <span style={{ color: 'gray', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <IoFlashOutline size={12} />
                                                        {emergencyState.timestamp && new Date(emergencyState.timestamp).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </span>
                                                    {muteReason?.time
                                                        ? <span style={{ color: 'gray', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                            <EmergencySoundUnmute size={12} />
                                                            {
                                                                muteReason.duration === emergencyMuteManager.oneYear ? 'До устранения' : new Date(muteReason!.time).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
                                                            }
                                                        </span>
                                                        : null
                                                    }
                                                </div>
                                                <span className="row-menu">
                                                    <EmergencyMuteMenu deviceId={emergencyState.deviceId} emergencyReasons={[r]} onMuteChanged={muteChanged} />
                                                </span>
                                            </div>
                                        </td>
                                    </tr>);
                                }
                            )
                        }
                    </tbody>
                </table>
            </div>
        </>
    );
}