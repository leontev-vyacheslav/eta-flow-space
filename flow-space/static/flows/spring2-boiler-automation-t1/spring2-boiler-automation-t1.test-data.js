const deviceState = {
    tempRoomAir: 20.3, // Температура в котельной (°C)
    tempOutAir: 20.3,  // Температура наружная (°C)
    pressGas: 20.3,    // Давление газа (бар)
    tempInNet: 22.4, // Температура на обратке сетевого контура (°C)
    pressInNet: 56.3, // Давление на обратке сетевого контура (бар)
    tempOutNet: 44.5, // температура на подаче сетевого контура (°C)
    pressOutNet: 66.8, // Давление на подаче сетевого контура (бар)
    levelDt1: 10.5, // Уровень в баке ДТ 1 (см)
    levelDt2: 10.5, // Уровень в баке ДТ 2 (см)
    pressOutSrcW: 10.5, // Давление исх. воды (бар)

    // enums (SensorStatus): "Норма"=1, "Предупреждение (выход параметра за предупр. границы)"=2, "Авария (выход параметра за аварийные границы)"=4, "Неисправность датчика"=8, "Неправильная калибровка"=16, "Перегрузка (выход сигнала датчика за установленные границы)"=32
    statusTempRoomAirSensor: 2, // Статус датчика температуры в котельной
    // enums (SensorStatus
    statusTempOutSensor: 2,  // Статус датчика температуры наружная
    // enums (SensorStatus)
    statusPressGasSensor: 2, // Статус датчика давления газа
    // enums (SensorStatus)
    statusTempInNetSensor: 2, // Статус датчика температуры на обратке сетевого контура
    // enums (SensorStatus)
    statusPressInNetSensor: 2, // Статус датчика давления на обратке сетевого контура
    // enums (SensorStatus)
    statusTempOutNetSensor: 2, // Статус датчика температуры на подаче сетевого контура
    // enums (SensorStatus)
    statusPressOutNetSensor: 2, // Статус датчика давления на подаче сетевого контура
    // enums (SensorStatus)
    statusLevelDt1Sensor: 2, // Статус датчика уровня ДТ 1
    // enums (SensorStatus)
    statusLevelDt2Sensor: 2, // Статус датчика уровня ДТ 2
    // enums (SensorStatus)
    statusPressOutSrcWSensor: 2, // Статус датчика давления исх. воды

    isSourceWaterRelay: false, // Реле давления исходной воды
    isCO: false, // Загазованность CO
    isCH: false, // Загазованность CH
    isGasFlap: false, // Клапан отсекатель газа закрыт
    isVaporDt1: false, // Загазованность горючими газами 1
    isVaporDt2: false, // Загазованность горючими газами 2
    isOffInput1: false, // Питание на вводе 1
    isOffInput2: false, // Питание на вводе 2

    // enums (SourcePumpStatus): "Нет питания"=1, "Остановлен"=2, "В работе"=4, "Авария"=8, "Запуск (разгон)"=16, "Останов"=32, "Регулирование (мин. частота)"=128, "Регулирование (макс. частота)"=256, "Ожидание включения"=512, "Ожидание готовности"=1024
    statusSourcePump: 2, // Статус насоса исходной воды

    boilers: [
        {
            // enum (BoilerState) :  "Нет готовности"=1, "Отключен"=2, "Включается"=4, "Работа (на 1 ступени)"=8, "Работа( на 2 ступени)"=16, "В горячем резерве"=32,"Останавливается"=64, "Авария"=128
            state: 1,      // Состояние котла
            tempOut: 123.5, // Температура воды на подаче котла (°C)
            tempFlueGases: 300.5, // Температура дымовых газов котла (°C)

            isBurnerFailure: false, // Авария горелки
            isWorking: true,        // Работа котла
            isGasRelayPressure: false, // Реле давления газа
            isMinWaterPressure: false, // Мин. давление воды
            isMaxWaterPressure: false, // Макс. давление воды
            isMaxWaterTemperature: false, // Макс. температура воды
            isFlowRelay: false, // Реле потока

            // enums (SensorStatus)
            statusTempOutSensor: 2, // Статус датчика температуры воды на подаче котла
            // enums (SensorStatus)
            statusTempFlueGasesSensor: 2, // Статус датчика температуры дымовых газов

        },
        {
            state: 2,
            tempOut: 80.9,
            tempFlueGases: 500.5,
            isBurnerFailure: false,
            isWorking: true,
            isGasRelayPressure: true,
            isMinWaterPressure: false,
            isMaxWaterPressure: false,
            isMaxWaterTemperature: true,
            isFlowRelay: false,

            // enums (SensorStatus)
            statusTempOutSensor: 2,
            // enums (SensorStatus)
            statusTempFlueGasesSensor: 2,
        },
        {
            state: 32,
            tempOut: 100.5,
            tempFlueGases: 500.5,
            isBurnerFailure: false,
            isWorking: true,
            isGasRelayPressure: false,
            isMinWaterPressure: false,
            isMaxWaterPressure: false,
            isMaxWaterTemperature: false,
            isFlowRelay: false,

            statusTempOutSensor: 2,
            statusTempFlueGasesSensor: 2,
        },
        {
            state: 128,
            tempOut: 95.8,
            tempFlueGases: 500.5,
            isBurnerFailure: false,
            isWorking: true,
            isGasRelayPressure: false,
            isMinWaterPressure: false,
            isMaxWaterPressure: false,
            isMaxWaterTemperature: false,
            isFlowRelay: false,

            statusTempOutSensor: 2,
            statusTempFlueGasesSensor: 2,
        }
    ], // Котлы


    boilerOutputValves: [
        {
            // enums (BoilerOutputValveState): "Открыта"=1, "Закрыта"=2
            state: 1 // Состояние задвижки на выходе котла
        },
        { state: 2 },
        { state: 1 },
        { state: 1 }
    ], // Задвижки на выходе котлов

    boilerPumps: [
        {
            // enums (BoilerPumpState): "Работа"=1, "Авария"=2
            state: 1, // Состояние насоса котла
            // enums (SensorStatus)
            statusCurrentSensor: 1 // Статус датчика тока
        },
        { state: 2, statusCurrentSensor: 1 },
        { state: 1, statusCurrentSensor: 2 },
        { state: 1, statusCurrentSensor: 8 }
    ], //  Насосы котлов

    networkPumps: [
        {
            // enum (NetworkPumpState): "Ожидание готовности"=1, "Готовность"=2, "Не используется"=4, "Не используется"=8, "Не используется"=16, "Запуск от ЧРП"=32, "В работе от ЧРП"=64, "Останов от ЧРП"=128, "Не используется"=256, "Авария"=512, "Не используется"=1024, "Не используется"=2048, "Не используется"=4096, "Не используется"=8192
            state: 1, // Состояние сетевого насоса
            isDryRun: false, // Сухой ход
            //  enum (NetworkPumpFrequencyConvertorStatus): "Работа ПЧ"=1, "Авария ПЧ"=2
            statusFc: 1,   // Статус ПЧ сетевого насоса
        },
        {
            state: 64,
            isDryRun: false,
            statusFc: 1,
        },
        {
            state: 512,
            isDryRun: false,
            statusFc: 2,
        }
    ] // Сетевые насосы
}