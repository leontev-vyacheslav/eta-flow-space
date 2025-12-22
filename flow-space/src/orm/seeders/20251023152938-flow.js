/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      "flow",
      [
        {
          code: "pump-monitors",
          name: 'Насосные стации',
          description: "Система мониторинга и управления насосных станций",
          uid: "a7c135e772de0725",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          code: "boiler-automation-1",
          name: 'Котельная №1',
          description: "Система мониторинга и управления котельной №1",
          uid: "6b32023651261592",
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
