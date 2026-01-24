/**
 * Аварии насоса подпитки
 */
export const enum SupplyPumpAlarm {
    EXCEEDED_STARTUP_TIME = 0,// Превышено время запуска
    EXCEEDED_SHUTDOWN_TIME = 1,// Превышено время останова
    SPONTANEOUS_STARTUP = 2,// Самопроизвольный запуск
    SPONTANEOUS_SHUTDOWN = 3,// Самопроизвольное отключение
    DRY_RUN = 4 // Сухой ход
}
