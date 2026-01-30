const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const PeticioAnalisi = sequelize.define('PeticioAnalisi', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  imagePath: { type: DataTypes.STRING, allowNull: true }, // ruta en uploads
  prompt: { type: DataTypes.TEXT, allowNull: true },
  modelUsed: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'peticions',
  timestamps: true
});

module.exports = PeticioAnalisi;
