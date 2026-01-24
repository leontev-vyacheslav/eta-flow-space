'use strict';

const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DeviceStateDataModel extends Model {

    static associate(models) {
      DeviceStateDataModel.belongsTo(models.DeviceDataModel, { foreignKey: 'deviceId', as: 'device' });
    }
  }
  
  DeviceStateDataModel.init({
    deviceId: DataTypes.INTEGER,
    state: DataTypes.JSON,
  }, {
    sequelize,
    modelName: 'DeviceStateDataModel',
    tableName: 'device_state',
    freezeTableName: true,
  });



  return DeviceStateDataModel;
};

