import { SupplyPumpStatus } from "../supply-pump-status";

/**
 * Описания статусов насоса подпитки
 */
export const SupplyPumpStatusDescriptions = {
    [SupplyPumpStatus.NO_POWER]: "Нет питания",
    [SupplyPumpStatus.STOPPED]: "Остановлен",
    [SupplyPumpStatus.STARTING]: "Запускается",
    [SupplyPumpStatus.OPERATING]: "Работа",
    [SupplyPumpStatus.STOPPING]: "Останавливается",
    [SupplyPumpStatus.ALARM]: "Авария"
} as const;
