const { createHash } = require("crypto");

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert("user", [
      {
        name: "leo",
        password: createHash("sha256").update("0987654321").digest("base64"),
        roleId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "statum-boiler-1-watcher",
        password: createHash("sha256").update("0987654321").digest("base64"),
        roleId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("user", null, {});
  },
};
