"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("device", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING(32),
      },
      flowId: {
        type: Sequelize.INTEGER,
        references: {
          model: "flow", // name of the target table
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      settings: {
        type: Sequelize.JSON,
      },
      updateStateInterval: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      lastStateUpdate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("device");
  },
};
