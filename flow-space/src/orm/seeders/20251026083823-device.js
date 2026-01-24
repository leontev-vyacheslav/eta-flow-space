const { Json } = require('sequelize/lib/utils');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "device",
      [
        {
          code: "pump-monitor-1",
          name: 'ГИМС',
          description: 'Общественное пространство ГИМС',
          flowId: 1,
          objectLocationId: 1,
          settings: JSON.stringify({ ip: "192.168.0.200", port: 502 }),
          updateStateInterval: 1,
          lastStateUpdate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          code: "pump-monitor-2",
          name: 'КНС-1',
          description: 'Кремлевская набережная, КНС-1',
          flowId: 1,
          objectLocationId: 2,
          settings: JSON.stringify({ ip: "192.168.0.200", port: 522 }),
          updateStateInterval: 2,
          lastStateUpdate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          code: "pump-monitor-3",
          name: 'КНС-2',
          description: 'Кремлевская набережная, КНС-2',
          flowId: 1,
           objectLocationId: 2,
          settings: JSON.stringify({ ip: "192.168.0.200", port: 532 }),
          updateStateInterval: 3,
          lastStateUpdate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          code: "boiler-automation-t1-1",
          name: 'Котельная №1',
          description: 'Котельная №1',
          flowId: 2,
          settings: JSON.stringify({ ip: "192.168.127.2", port: 503 }),
          updateStateInterval: 3,
          lastStateUpdate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("device", null, {});
  },
};

