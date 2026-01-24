/**
 * Аварии частотного преобразователя (ЧРП)
 */
export const enum VariableFrequencyDriveAlarm {
    EXCEEDED_STARTUP_TIME = 0,// Превышено время включения
    EXCEEDED_SHUTDOWN_TIME = 1,// Превышено время отключения
    SPONTANEOUS_SHUTDOWN = 2,// Самопроизвольное отключение
    SPONTANEOUS_STARTUP = 3,// Самопроизвольное включение
    VFD_ALARM = 4,// Авария ПЧ
    POWER_LOSS_DURING_OPERATION = 5,// Пропадание питания/связи во время работы
    MIN_CURRENT_AT_MAX_FREQUENCY = 6,// Минимальный ток при максимальной частоте
    MIN_FREQUENCY_NOT_REACHED = 7 // Не достигнута мин. частота
}
