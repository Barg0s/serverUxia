const { Sequelize } = require('sequelize');
require('dotenv').config();

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;
if (dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './db/database.sqlite',
    logging: false
  });
} else {
  // ejemplo para DATABASE_URL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect,
    logging: false
  });
}

module.exports = sequelize;
