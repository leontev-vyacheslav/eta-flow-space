const state = {
    tempRoomAir: 20.3, // температура  в котельной
    tempOutAir: 20.3,  // температура наружная
    pressGas: 20.3,    // давление газа

    tempInNet: 22.4, // температура на обратке сетевого контура
    pressInNet: 56.3, // давление на обратке сетевого контура
    tempOutNet: 44.5, // температура на подаче сетевого контура
    pressOutNet: 66.8, // давление на подаче сетевого контура
    levelDt1: 10.5, // уровень воды в ДТ 1
    levelDt2: 10.5, // уровень воды в ДТ 2
    pressOutSrcW: 10.5, // Давление исх. воды

     // enums (SensorStatus): "норма"=1, "предупреждение (выход параметра за предупр. границы)"=2, "авария (выход параметра за аварийные границы)"=4, "неисправность датчика"=8, "неправильная калибровка"=16, "перегрузка"=32
    statusTempAirSensor: 2,
    // enums (SensorStatus
    statusTempOutSensor: 2,
    // enums (SensorStatus)
    statusPressGasSensor: 2,
    // enums (SensorStatus)
    statusTempInNetSensor: 2,
    // enums (SensorStatus)
    statusPressInNetSensor: 2,
    // enums (SensorStatus)
    statusTempOutNetSensor: 2,
    // enums (SensorStatus)
    statusPressOutNetSensor: 2,
    // enums (SensorStatus)
    statusLevelDt1Sensor: 2,
    // enums (SensorStatus)
    statusLevelDt2Sensor: 2,
    // enums (SensorStatus)
    statusPressOutSrcWSensor: 2,


    isSourceWaterRelay: false,
    isCO: false,
    isCH: false,
    isGasFlap: false,
    isVaporDt1: false,
    isVaporDt2: false,
    isOffInput1: false,
    isOffInput2: false,

    boilers: [
        {
            // enum (BoilerState) :  "нет готовности"=1, "отключен"=2, "включается"=4, "работа на 1 ступени"=8, "работа на 2 ступени"=16, "в горячем резерве"=32,"останавливается"=64, "авария"=128
            status: 1,
            tempOut: 123.5, // Температура воды на подаче котла
            tempFlueGases: 300.5, // Температура дымовых газов котла
            isBurnerFailure: false,
            isWorking: true,
            isGasRelayPressure: false,
            isMinWaterPressure: false,
            isMaxWaterPressure: false,
            isMaxWaterTemperature: false,
            isFlowRelay: false,

            // enums (SensorStatus)
            statusTempOutSensor: 2,
            // enums (SensorStatus)
            statusTempFlueGasesSensor: 2,

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
    ],
    boilerOutputValves: [
        {
            // enums: "Открыта"=1, "Закрыта"=2
            state: 1
        },
        { state: 2 },
        { state: 1 },
        { state: 1 }
    ],

    boilerPumps: [
        {
            // enums (BoilerPumpState): "Работа"=1, "Авария"=2
            state: 1,
            // enums (SensorStatus)
            statusCurrentSensor: 1
        },
        { state: 2, statusCurrent: 1 },
        { state: 1, statusCurrent: 2 },
        { state: 1, statusCurrent: 8 }
    ],
    networkPumps: [
        {
            // enum (NetworkPumpState): "Работа ПЧ"=1, "Авария ПЧ"=2
            state: 1,
            isDryRun: false,
            // enum (NetworkPumpStatus): "Ожидание готовности"=1, "Готовность"=2, "не используется"=4, "не используется"=8, "не используется"=16, "Запуск от ЧРП"=32, "В работе от ЧРП"=64, "Останов от ЧРП"=128, "не используется"=256, "Авария"=512, "не используется"=1024, "не используется"=2048, "не используется"=4096, "не используется"=8192
            status: 1,
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
    ]
}