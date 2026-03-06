import { useCallback } from "react";
import { MainMenu } from "../../components/menu/main-menu/main-menu";
import { EmergencySoundMute, OneHourIcon, TwoHourIcon, ThreeHourIcon, WarningLogIcon } from "../../constants/app-icons";

export const EmergencyPopoverContent = ({ emergencyState }: { emergencyState: any }) => {

    const MenuRender = useCallback(({ emergencyReason }: { emergencyReason: any }) => {
        return (
            <MainMenu disabled={true} items={[
                {
                    icon: () => <EmergencySoundMute size={20} color='black' />,
                    items: [
                        {
                            text: 'На 1 час',
                            icon: () => <OneHourIcon size={20} />,
                            onClick: () => {
                                alert(`На 1 час: ${emergencyReason.id}`);
                            },
                        },
                        {
                            text: 'На 2 часа',
                            icon: () => <TwoHourIcon size={20} />,
                            onClick: () => {
                                alert(`На 2 час: ${emergencyReason.id}`);
                            }
                        },
                        {
                            text: 'На 3 часа',
                            icon: () => <ThreeHourIcon size={20} />,
                            onClick: () => {
                                alert(`На 3 час: ${emergencyReason.id}`);
                            }
                        }
                    ]
                }
            ]} />
        );
    }, []);

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
                                            <MenuRender emergencyReason={r} />
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