const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../database.sqlite'),
    logging: console.log
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  },
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

const sequelize = new Sequelize(config[env]);

module.exports = sequelize;