'use strict';

const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class EmergencyStateDataModel extends Model {

    static associate(models) {
      EmergencyStateDataModel.belongsTo(models.DeviceDataModel, { foreignKey: 'deviceId', as: 'device' });
    }
  }

  EmergencyStateDataModel.init({
    deviceId: DataTypes.INTEGER,
    state: DataTypes.JSON,
  }, {
    sequelize,
    modelName: 'EmergencyStateDataModel',
    tableName: 'emergency_state',
    freezeTableName: true,
  });



  return EmergencyStateDataModel;
};

