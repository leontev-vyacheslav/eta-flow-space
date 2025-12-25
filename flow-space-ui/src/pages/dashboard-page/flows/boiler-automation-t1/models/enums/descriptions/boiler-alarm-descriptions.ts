import { BoilerAlarm } from "../boiler-alarm";

/**
 * Описания аварий котла
*/
export const BoilerAlarmDescriptions = {
    [BoilerAlarm.TEMP_SENSOR_FAULT]: "Неисправность датчика температуры на выходе",
    [BoilerAlarm.BURNER_ALARM]: "Авария горелки",
    [BoilerAlarm.PRESSURE_SENSOR_FAULT]: "Неисправность датчика давления",
    [BoilerAlarm.SAFETY_CIRCUIT]: "Цепь безопасности",
    [BoilerAlarm.EMERGENCY_STOP]: "Аварийный останов",
    [BoilerAlarm.HIGH_TEMP_THRESHOLD]: "Аварийно высокий порог температуры",
    [BoilerAlarm.HIGH_PRESSURE_THRESHOLD]: "Аварийно высокий порог давления",
    [BoilerAlarm.LOW_PRESSURE_THRESHOLD]: "Аварийно низкий порог давления",
    [BoilerAlarm.NO_FLOW]: "Нет протока",
    [BoilerAlarm.PUMPS_DISCONNECTED]: "Отключение насосов",
    [BoilerAlarm.BURNER_IGNITION_TIMEOUT]: "Таймаут розжига горелки",
    [BoilerAlarm.SPONTANEOUS_BURNER_SHUTDOWN]: "Самопроизвольное отключение горелки",
    [BoilerAlarm.VALVE_ALARM]: "Авария задвижки"
} as const;
