"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class ReportDataModel extends Model {
        static associate(models) {
            // A report belongs to a single device (many-to-one)
            ReportDataModel.belongsTo(models.DeviceDataModel, {
                foreignKey: "deviceId",
                as: "device",
            });
        }
    }

    ReportDataModel.init(
        {
            code: {
                type: DataTypes.STRING(64),
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING(128),
                allowNull: false,
            },
            deviceId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: "device", // table name of the Device model
                    key: "id",
                },
                field: "deviceId", // optional: ensures column name matches SQLAlchemy
            },
            url: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            settings: {
                type: DataTypes.JSON,
                allowNull: true,
            },
        },
        {
            sequelize,
            modelName: "ReportDataModel",
            tableName: "report",
            freezeTableName: true,
        }
    );

    return ReportDataModel;
};