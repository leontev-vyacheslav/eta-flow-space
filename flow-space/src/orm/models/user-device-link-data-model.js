'use strict';

const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserDeviceLinkDataModel extends Model {
    static associate(models) {
      UserDeviceLinkDataModel.belongsTo(models.UserDataModel, { foreignKey: 'userId', as: 'user' });
      UserDeviceLinkDataModel.belongsTo(models.DeviceDataModel, { foreignKey: 'deviceId', as: 'device' });
    }
  }

  UserDeviceLinkDataModel.init({
    userId: DataTypes.INTEGER,
    deviceId: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'UserDeviceLinkDataModel',
    tableName: 'user_device_link',
    freezeTableName: true,
  });

  return UserDeviceLinkDataModel;
};

