import { VariableFrequencyDriveStatus } from "../variable-frequency-drive-status";

/**
 * Описания статусов ЧРП
 */
export const VariableFrequencyDriveStatusDescriptions = {
    [VariableFrequencyDriveStatus.NO_POWER]: "Нет питания",
    [VariableFrequencyDriveStatus.STOPPED]: "Остановлен",
    [VariableFrequencyDriveStatus.OPERATING]: "В работе",
    [VariableFrequencyDriveStatus.ALARM]: "Авария",
    [VariableFrequencyDriveStatus.STARTUP_ACCELERATION]: "Запуск (разгон)",
    [VariableFrequencyDriveStatus.STOP]: "Останов",
    [VariableFrequencyDriveStatus.REGULATION_MIN_FREQUENCY]: "Регулирование, мин. частота",
    [VariableFrequencyDriveStatus.REGULATION_MAX_FREQUENCY]: "Регулирование, макс. частота",
    [VariableFrequencyDriveStatus.WAITING_FOR_START]: "Ожидание включения",
    [VariableFrequencyDriveStatus.WAITING_FOR_READINESS]: "Ожидание готовности"
} as const;
