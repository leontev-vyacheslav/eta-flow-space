const state = {
    tempRoomAir: 20.3, // Температура в котельной
    tempOutAir: 20.3,  // Температура наружная
    pressGas: 20.3,    // Давление газа

    tempInNet: 22.4, // Температура на обратке сетевого контура
    pressInNet: 56.3, // Давление на обратке сетевого контура
    tempOutNet: 44.5, // температура на подаче сетевого контура
    pressOutNet: 66.8, // Давление на подаче сетевого контура
    levelDt1: 10.5, // Уровень в баке ДТ 1
    levelDt2: 10.5, // Уровень в баке ДТ 2
    pressOutSrcW: 10.5, // Давление исх. воды

    // enums (SensorStatus): "норма"=1, "предупреждение (выход параметра за предупр. границы)"=2, "авария (выход параметра за аварийные границы)"=4, "неисправность датчика"=8, "неправильная калибровка"=16, "перегрузка"=32
    statusTempAirSensor: 2, // Статус датчика температуры в котельной
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

    // enums (SourcePumpStatus): "нет питания"=1, "остановлен"=2, "в работе"=4, "авария"=8, "запуск (разгон)"=16, "останов"=32, "Регулирование, мин. частота"=128, "Регулирование, макс. частота"=256, "ожидание включения"=512, "ожидание готовности"=1024
    statusSourcePump: 2, // Статус насоса исходной воды

    boilers: [
        {
            // enum (BoilerState) :  "нет готовности"=1, "отключен"=2, "включается"=4, "работа на 1 ступени"=8, "работа на 2 ступени"=16, "в горячем резерве"=32,"останавливается"=64, "авария"=128
            status: 1,
            tempOut: 123.5, // Температура воды на подаче котла
            tempFlueGases: 300.5, // Температура дымовых газов котла

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
            status: 2,
            tempOut: 80.9,
            tempFlueGases: 500.5,
            statusTempOutSensor: 2,
            statusTempFlueGasesSensor: 2,
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
            status: 32,
            tempOut: 100.5,
            statusTempOutSensor: 2,
            tempFlueGases: 500.5,
            statusTempFlueGasesSensor: 2,
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
            status: 128,
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
        { state: 2, statusCurrent: 1 },
        { state: 1, statusCurrent: 2 },
        { state: 1, statusCurrent: 8 }
    ], //  Насосы котлов

    networkPumps: [
        {
            // enum (NetworkPumpState): "Работа ПЧ"=1, "Авария ПЧ"=2
            state: 1,   // Состояние сетевого насоса
            isDryRun: false, // Сухой ход
            // enum (NetworkPumpStatus): "Ожидание готовности"=1, "Готовность"=2, "не используется"=4, "не используется"=8, "не используется"=16, "Запуск от ЧРП"=32, "В работе от ЧРП"=64, "Останов от ЧРП"=128, "не используется"=256, "Авария"=512, "не используется"=1024, "не используется"=2048, "не используется"=4096, "не используется"=8192
            status: 1, // Статус сетевого насоса
        },
        {
            state: 1,
            isDryRun: false,
            status: 64,
        },
        {

            state: 2,
            isDryRun: false,
            status: 512,
        }
    ] // Сетевые насосы
}