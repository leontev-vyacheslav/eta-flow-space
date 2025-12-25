import { VariableFrequencyDriveAlarm } from "../variable-frequency-drive-alarm";

/**
 * Описания аварий ЧРП
 */
export const VariableFrequencyDriveAlarmDescriptions = {
    [VariableFrequencyDriveAlarm.EXCEEDED_STARTUP_TIME]: "Превышено время включения",
    [VariableFrequencyDriveAlarm.EXCEEDED_SHUTDOWN_TIME]: "Превышено время отключения",
    [VariableFrequencyDriveAlarm.SPONTANEOUS_SHUTDOWN]: "Самопроизвольное отключение",
    [VariableFrequencyDriveAlarm.SPONTANEOUS_STARTUP]: "Самопроизвольное включение",
    [VariableFrequencyDriveAlarm.VFD_ALARM]: "Авария ПЧ",
    [VariableFrequencyDriveAlarm.POWER_LOSS_DURING_OPERATION]: "Пропадание питания/связи во время работы",
    [VariableFrequencyDriveAlarm.MIN_CURRENT_AT_MAX_FREQUENCY]: "Минимальный ток при максимальной частоте",
    [VariableFrequencyDriveAlarm.MIN_FREQUENCY_NOT_REACHED]: "Не достигнута мин. частота"
} as const;
