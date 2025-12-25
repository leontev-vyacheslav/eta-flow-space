import { BoilerStatus } from "../boiler-status";

/**
 * Описания статусов котла
 */
export const BoilerStatusDescriptions = {
    [BoilerStatus.STOPPED]: "Остановлен",
    [BoilerStatus.OPENING_OUTLET_VALVE]: "Открытие задвижки на выходе котла",
    [BoilerStatus.BURNER_STARTUP]: "Запуск горелки",
    [BoilerStatus.OPERATION_LOW_BURN]: "Работа - малое горение",
    [BoilerStatus.OPERATION_REGULATION]: "Работа (регулирование)",
    [BoilerStatus.BURNER_STOP]: "Останов горелки",
    [BoilerStatus.ALARM]: "Авария",
    [BoilerStatus.HOT_RESERVE]: "Горячий резерв",
    [BoilerStatus.CLOSING_OUTLET_VALVE]: "Закрытие задвижки",
    [BoilerStatus.NOT_READY]: "Нет готовности"
} as const;
