/**
 * Аварии сетевого насоса
 */
export const enum NetworkPumpAlarm {
    NOT_USED_0 = 0,// Не используется
    NOT_USED_1 = 1,// Не используется
    NOT_USED_2 = 2,// Не используется
    VFD_ALARM = 3,// Авария ПЧ
    NOT_USED_4 = 4,// Не используется
    NO_VFD_READINESS = 5,// Нет готовности ПЧ
    DRY_RUN = 6 // Сухой ход
}
