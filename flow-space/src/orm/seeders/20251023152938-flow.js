/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "flow",
      [
        {
          code: "sewage-pump-monitor",
          name: 'Насосные стации',
          description: "Система мониторинга и управления насосных станций",
          uid: "a7c135e772de0725",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("flow", null, {});
  },
};
