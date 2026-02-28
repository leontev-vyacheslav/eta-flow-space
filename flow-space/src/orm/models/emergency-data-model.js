'use strict';

const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class EmergencyDataModel extends Model {

    static associate(models) {
      EmergencyDataModel.belongsTo(models.DeviceDataModel, { foreignKey: 'deviceId', as: 'device' });
    }
  }

  EmergencyDataModel.init({
    deviceId: DataTypes.INTEGER,
    reasons: DataTypes.JSON,
  }, {
    sequelize,
    modelName: 'EmergencyDataModel',
    tableName: 'emergency',
    freezeTableName: true,
  });



  return EmergencyDataModel;
};

