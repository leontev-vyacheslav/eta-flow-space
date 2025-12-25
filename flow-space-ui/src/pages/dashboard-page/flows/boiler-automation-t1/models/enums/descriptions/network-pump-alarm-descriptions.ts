import { NetworkPumpAlarm } from "../network-pump-alarm";

/**
 * Описания аварий сетевого насоса
 */
export const NetworkPumpAlarmDescriptions = {
    [NetworkPumpAlarm.NOT_USED_0]: "Не используется",
    [NetworkPumpAlarm.NOT_USED_1]: "Не используется",
    [NetworkPumpAlarm.NOT_USED_2]: "Не используется",
    [NetworkPumpAlarm.VFD_ALARM]: "Авария ПЧ",
    [NetworkPumpAlarm.NOT_USED_4]: "Не используется",
    [NetworkPumpAlarm.NO_VFD_READINESS]: "Нет готовности ПЧ",
    [NetworkPumpAlarm.DRY_RUN]: "Сухой ход"
} as const;
