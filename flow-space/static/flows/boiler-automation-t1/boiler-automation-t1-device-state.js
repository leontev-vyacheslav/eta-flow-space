const stateModel = {
  // Temperature and pressure sensors
  tempRoomAir: 22.5,
  tempOutAir: 15.3,
  pressGas: 1.2,
  levelDt1: 75.0,
  levelDt2: 80.5,

  // Network parameters
  pressOutNet: 6.5,
  tempOutNet: 85.0,
  pressInNet: 4.5,
  tempInNet: 65.0,
  pressOutSrcW: 3.2,

  // Boilers (4-fold)
  boilers: [
    {
      powerBurner: 75.0,
      mode: 4, // панель (управление с панели шкафа управления)
      status: 4, // Работа -малое горение
      alarm: 0 // Нет аварий
    },
    {
      powerBurner: 0.0,
      mode: 0, // не используется
      status: 0, // Остановлен
      alarm: 0 // Нет аварий
    },
    {
      powerBurner: 0.0,
      mode: 0, // не используется
      status: 0, // Остановлен
      alarm: 0 // Нет аварий
    },
    {
      powerBurner: 0.0,
      mode: 1, // ремонт
      status: 0, // Остановлен
      alarm: 0 // Нет аварий
    }
  ],

  // Boiler valves (4-fold)
  boilerValves: [
    { status: 2 }, // Открыта
    { status: 1 }, // Закрыта
    { status: 1 }, // Закрыта
    { status: 1 }  // Закрыта
  ],

  // Network pumps (4-fold)
  networkPumps: [
    {
      setPower: 75.0,
      mode: 4, // панель
      status: 6, // В работе от ЧРП
      alarm: 0, // нет аварий
      modeFc: 4, // панель
      statusFc: 2, // В работе
      alarmFc: 0 // нет аварий
    },
    {
      setPower: 0.0,
      mode: 0, // не используется
      status: 11, // Остановлен, готовность элементов ЧРП
      alarm: 0, // нет аварий
      modeFc: 0, // не используется
      statusFc: 1, // Остановлен
      alarmFc: 0 // нет аварий
    },
    {
      setPower: 0.0,
      mode: 0, // не используется
      status: 0, // Ожидание готовности
      alarm: 0, // нет аварий
      modeFc: 0, // не используется
      statusFc: 9, // Ожидание включения
      alarmFc: 0 // нет аварий
    },
    {
      setPower: 0.0,
      mode: 1, // ремонт
      status: 9, // Авария
      alarm: 3, // Авария ПЧ
      modeFc: 1, // ремонт
      statusFc: 3, // Авария
      alarmFc: 4 // Авария ПЧ
    }
  ],

  // Source water pumps (2-fold)
  sourceWaterPumps: [
    {
      setPower: 60.0,
      mode: 4, // панель
      status: 6, // В работе от ЧРП
      alarm: 0, // нет аварий
      modeFc: 4, // панель
      statusFc: 2, // В работе
      alarmFc: 0 // нет аварий
    },
    {
      setPower: 0.0,
      mode: 0, // не используется
      status: 11, // Остановлен, готовность элементов ЧРП
      alarm: 0, // нет аварий
      modeFc: 0, // не используется
      statusFc: 1, // Остановлен
      alarmFc: 0 // нет аварий
    }
  ],

  // Supply pumps (2-fold)
  supplyPumps: [
    {
      mode: 4, // панель
      status: 3, // Работа
      alarm: 0 // нет аварий
    },
    {
      mode: 0, // не используется
      status: 1, // Остановлен
      alarm: 0 // нет аварий
    }
  ],

  // Flaps
  flapHt: { mode: 0 }, // авто
  flapHn: { mode: 0 }, // авто
  flapDt: { mode: 1 }, // ручной
  flapDtFill: { mode: 0 } // авто
};

