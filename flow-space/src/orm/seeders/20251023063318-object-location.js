
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("object_location", [
      {
        latitude: 55.873751,
        longitude: 49.057780,
        address: " 77/17, Ашхабадская улица, Казань",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("object_location", null, {});
  },
};
