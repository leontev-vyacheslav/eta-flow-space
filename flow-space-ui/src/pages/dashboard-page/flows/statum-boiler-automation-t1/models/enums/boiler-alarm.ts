/**
 * Коды аварий котла
*/
export const enum BoilerAlarm {
    TEMP_SENSOR_FAULT = 0,// Неисправность датчика температуры на выходе
    BURNER_ALARM = 1,// Авария горелки
    PRESSURE_SENSOR_FAULT = 2,// Неисправность датчика давления
    SAFETY_CIRCUIT = 3,// Цепь безопасности
    EMERGENCY_STOP = 4,// Аварийный останов
    HIGH_TEMP_THRESHOLD = 5,// Аварийно высокий порог температуры
    HIGH_PRESSURE_THRESHOLD = 6,// Аварийно высокий порог давления
    LOW_PRESSURE_THRESHOLD = 7,// Аварийно низкий порог давления
    NO_FLOW = 8,// Нет протока
    PUMPS_DISCONNECTED = 9,// Отключение насосов
    BURNER_IGNITION_TIMEOUT = 10,// Таймаут розжига горелки
    SPONTANEOUS_BURNER_SHUTDOWN = 11,// Самопроизвольное отключение горелки
    VALVE_ALARM = 12 // Авария задвижки
}
