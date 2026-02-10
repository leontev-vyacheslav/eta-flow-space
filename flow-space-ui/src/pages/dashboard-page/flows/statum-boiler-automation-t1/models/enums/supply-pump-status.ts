/**
 * Состояние насоса подпитки
 */
export const enum SupplyPumpStatus {
    NO_POWER = 0,// Нет питания
    STOPPED = 1,// Остановлен
    STARTING = 2,// Запускается
    OPERATING = 3,// Работа
    STOPPING = 4,// Останавливается
    ALARM = 5 // Авария
}
