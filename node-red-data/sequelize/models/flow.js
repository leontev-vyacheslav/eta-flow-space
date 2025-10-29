"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Flow extends Model {
    static associate(models) {
      Flow.hasMany(models.Device, { foreignKey: "flowId", as: "devices" });
    }
  }
  Flow.init(
    {
      name: DataTypes.STRING(32),
      uid: DataTypes.STRING(16),
    },
    {
      sequelize,
      modelName: "Flow",
      tableName: "flow",
      freezeTableName: true,
    }
  );

  return Flow;
};
