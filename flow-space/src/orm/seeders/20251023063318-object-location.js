
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("object_location", [
      {
        latitude: 55.79698090,
        longitude: 49.09204649,
        address: "Kazan, Republic of Tatarstan, Russia, 420111",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        latitude: 55.80255230,
        longitude: 49.11235635,
        address: "Кремлевская набережная, Казань",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        latitude: 55.80255230,
        longitude: 49.11235635,
        address: "Кремлевская набережная, Казань",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        latitude: 55.82083493407019,
        longitude:  49.12932007063475,
        address: "ул. Чистопольская, 63, Kazan, 420088",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("object_location", null, {});
  },
};
