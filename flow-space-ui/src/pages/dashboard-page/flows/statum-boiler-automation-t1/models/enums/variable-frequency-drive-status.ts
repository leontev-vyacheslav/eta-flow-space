/**
 * Статус частотного преобразователя (ЧРП)
 */
export const enum VariableFrequencyDriveStatus {
    NO_POWER = 0,// Нет питания
    STOPPED = 1,// Остановлен
    OPERATING = 2,// В работе
    ALARM = 3,// Авария
    STARTUP_ACCELERATION = 4,// Запуск (разгон)
    STOP = 5,// Останов
    REGULATION_MIN_FREQUENCY = 7,// Регулирование, мин. частота
    REGULATION_MAX_FREQUENCY = 8,// Регулирование, макс. частота
    WAITING_FOR_START = 9,// Ожидание включения
    WAITING_FOR_READINESS = 10 // Ожидание готовности
}
