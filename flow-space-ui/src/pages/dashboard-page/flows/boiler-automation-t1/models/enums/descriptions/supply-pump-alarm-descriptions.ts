import { SupplyPumpAlarm } from "../supply-pump-alarm";

/**
 * Описания аварий насоса подпитки
 */
export const SupplyPumpAlarmDescriptions = {
    [SupplyPumpAlarm.EXCEEDED_STARTUP_TIME]: "Превышено время запуска",
    [SupplyPumpAlarm.EXCEEDED_SHUTDOWN_TIME]: "Превышено время останова",
    [SupplyPumpAlarm.SPONTANEOUS_STARTUP]: "Самопроизвольный запуск",
    [SupplyPumpAlarm.SPONTANEOUS_SHUTDOWN]: "Самопроизвольное отключение",
    [SupplyPumpAlarm.DRY_RUN]: "Сухой ход"
} as const;
