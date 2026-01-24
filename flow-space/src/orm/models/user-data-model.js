'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserDataModel extends Model {

    static associate(models) {
      // define association here
    }
  }
  UserDataModel.init({
    name: DataTypes.STRING(32),
    password: DataTypes.STRING(128),
    roleId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'UserDataModel',
    tableName: 'user',
    freezeTableName: true,
  });
  return UserDataModel;
};