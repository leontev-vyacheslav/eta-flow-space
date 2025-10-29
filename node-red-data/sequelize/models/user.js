'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {

    static associate(models) {
      // define association here
    }
  }
  User.init({
    name: DataTypes.STRING(32),
    password: DataTypes.STRING(128)
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'user',
    freezeTableName: true,
  });
  return User;
};