/**
 * Состояние котла
 */
export const enum BoilerStatus {
    STOPPED = 0,// Остановлен
    OPENING_OUTLET_VALVE = 1,// Открытие задвижки на выходе котла
    BURNER_STARTUP = 2,// Запуск горелки
    OPERATION_LOW_BURN = 3,// Работа - малое горение
    OPERATION_REGULATION = 4,// Работа (регулирование)
    BURNER_STOP = 5,// Останов горелки
    ALARM = 6,// Авария
    HOT_RESERVE = 8,// Горячий резерв
    CLOSING_OUTLET_VALVE = 9,// Закрытие задвижки
    NOT_READY = 10 // Нет готовности
}
