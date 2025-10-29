'use strict';

const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DeviceState extends Model {

    static associate(models) {
      DeviceState.belongsTo(models.Device, { foreignKey: 'deviceId', as: 'device' });
    }
  }
  DeviceState.init({
    deviceId: DataTypes.INTEGER,
    state: DataTypes.JSON,
  }, {
    sequelize,
    modelName: 'DeviceState',
    tableName: 'device_state',
    freezeTableName: true,
  });



  return Device;
};

