const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Usuari = sequelize.define('Usuari', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nickname: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  telefon: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING }, // hashed
  role: { type: DataTypes.STRING, defaultValue: 'user' }, // 'admin' o 'user'
  apiKey: { type: DataTypes.STRING, allowNull: true } // token para autenticación
}, {
  tableName: 'usuaris',
  timestamps: true
});

module.exports = Usuari;
