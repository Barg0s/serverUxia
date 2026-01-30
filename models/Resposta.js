const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Resposta = sequelize.define('Resposta', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  text: { type: DataTypes.TEXT, allowNull: true },
  tags: { type: DataTypes.JSON, allowNull: true } // array de tags
}, {
  tableName: 'respostes',
  timestamps: true
});

module.exports = Resposta;
