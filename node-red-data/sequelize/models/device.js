'use strict';

const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Device extends Model {

    static associate(models) {
      Device.belongsTo(models.Flow, { foreignKey: 'flowId', as: 'flow' });
      Device.hasMany(models.DeviceState, { foreignKey: 'deviceId', as: 'states' });
    }
  }
  Device.init({
    name: DataTypes.STRING(32),
    flowId: DataTypes.INTEGER,
    settings: DataTypes.JSON,
  }, {
    sequelize,
    modelName: 'Device',
    tableName: 'device',
    freezeTableName: true,
  });



  return Device;
};

