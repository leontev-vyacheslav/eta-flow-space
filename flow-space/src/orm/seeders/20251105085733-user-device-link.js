module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("user_device_link", [
      {
        userId: 1,
        deviceId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: 1,
        deviceId: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: 1,
        deviceId: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: 2,
        deviceId: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("user_device_link", null, {});
  },
};
