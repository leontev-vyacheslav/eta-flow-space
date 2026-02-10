/**
 * Состояние сетевого насоса
 */
export const enum NetworkPumpStatus {
    WAITING_FOR_READINESS = 0,// Ожидание готовности
    READINESS = 1,// Готовность
    START_FROM_VFD = 5,// Запуск от ЧРП
    OPERATING_FROM_VFD = 6,// В работе от ЧРП
    STOP_FROM_VFD = 7,// Останов от ЧРП
    ALARM = 9,// Авария
    STOPPED_VFD_READINESS = 11 // Остановлен, готовность элементов ЧРП
}
