'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

const config = require(__dirname + '/../database.config.json')[env];
const orm = {};

const kebabToPascal = (str) =>
  str ? str
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
    : '';

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    const modelName = kebabToPascal(model.name);
    orm[modelName] = model;
  });

Object.keys(orm).forEach(modelName => {
  if (orm[modelName].associate) {
    orm[modelName].associate(orm);
  }
});

orm.sequelize = sequelize;
orm.Sequelize = Sequelize;

module.exports = orm;
