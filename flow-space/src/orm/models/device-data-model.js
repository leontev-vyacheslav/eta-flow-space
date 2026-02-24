'use strict';

const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DeviceDataModel extends Model {
    static associate(models) {
      DeviceDataModel.belongsTo(models.FlowDataModel, { foreignKey: 'flowId', as: 'flow' });
      DeviceDataModel.belongsTo(models.ObjectLocationDataModel, { foreignKey: 'objectLocationId', as: 'objectLocation' });
      DeviceDataModel.hasMany(models.DeviceStateDataModel, { foreignKey: 'deviceId', as: 'states' });
      DeviceDataModel.hasMany(models.EmergencyStateDataModel, { foreignKey: 'deviceId', as: 'emergencyStates' });
      DeviceDataModel.hasMany(models.UserDeviceLinkDataModel, { foreignKey: 'deviceId', as: 'userDeviceLinks' });
    }
  }

  DeviceDataModel.init({
    code: DataTypes.STRING(32),
    name: DataTypes.STRING(32),
    description: DataTypes.STRING(32),
    flowId: DataTypes.INTEGER,
    settings: DataTypes.JSON,
    updateStateInterval: DataTypes.INTEGER,
    lastStateUpdate: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'DeviceDataModel',
    tableName: 'device',
    freezeTableName: true,
  });

  return DeviceDataModel;
};

