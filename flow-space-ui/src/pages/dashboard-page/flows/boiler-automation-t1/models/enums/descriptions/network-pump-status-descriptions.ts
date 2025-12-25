import { NetworkPumpStatus } from "../network-pump-status";

/**
 * Описания статусов сетевого насоса
 */
export const NetworkPumpStatusDescriptions = {
    [NetworkPumpStatus.WAITING_FOR_READINESS]: "Ожидание готовности",
    [NetworkPumpStatus.READINESS]: "Готовность",
    [NetworkPumpStatus.START_FROM_VFD]: "Запуск от ЧРП",
    [NetworkPumpStatus.OPERATING_FROM_VFD]: "В работе от ЧРП",
    [NetworkPumpStatus.STOP_FROM_VFD]: "Останов от ЧРП",
    [NetworkPumpStatus.ALARM]: "Авария",
    [NetworkPumpStatus.STOPPED_VFD_READINESS]: "Остановлен, готовность элементов ЧРП"
} as const;
