const { Json } = require('sequelize/lib/utils');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "device",
      [
        {
          name: "pumping-monitor-1",
          flowId: 1,
          settings: JSON.stringify({ ip: "192.168.0.200", port: 502 }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "pumping-monitor-2",
          flowId: 1,
          settings: JSON.stringify({ ip: "192.168.0.200", port: 522 }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "pumping-monitor-3",
          flowId: 1,
          settings: JSON.stringify({ ip: "192.168.0.200", port: 532 }),
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

