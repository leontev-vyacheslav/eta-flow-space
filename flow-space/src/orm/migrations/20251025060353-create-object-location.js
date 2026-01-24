"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("object_location", {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            latitude: {
                type: Sequelize.DECIMAL(10, 8),
                allowNull: false,
                validate: {
                    min: -90,
                    max: 90,
                    isDecimal: true
                }
            },
            longitude: {
                type: Sequelize.DECIMAL(11, 8),
                allowNull: false,
                validate: {
                    min: -180,
                    max: 180,
                    isDecimal: true
                }
            },
            address: {
                type: Sequelize.STRING(128),
                allowNull: true
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
        await queryInterface.dropTable("object_location");
    },
};
