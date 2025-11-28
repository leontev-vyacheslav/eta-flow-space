"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
    class ObjectLocationDataModel extends Model {
        static associate(models) {
            ObjectLocationDataModel.hasMany(models.DeviceDataModel, { foreignKey: "objectLocationId", as: "devices" });
        }
    }

    ObjectLocationDataModel.init(
        {
            address: DataTypes.STRING(128),
            latitude: DataTypes.DECIMAL(10, 8),
            longitude: DataTypes.DECIMAL(11, 8),
        },
        {
            sequelize,
            modelName: "ObjectLocationDataModel",
            tableName: "object_location",
            freezeTableName: true,
        }
    );

    return ObjectLocationDataModel;
};
