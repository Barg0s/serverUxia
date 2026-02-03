const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definición del Modelo Usuario (Tabla Users)
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    // Nombre de usuario interno (opcional si usamos email para login)
    username: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // Nombre visible del usuario (Nickname)
    nickname: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Email único, usado para login de administrador
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    // Contraseña (Solo obligatoria para admins en este sprint)
    password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Teléfono para validación de usuarios móviles
    telefon: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Rol del usuario: 'admin' o 'normal'
    role: {
        type: DataTypes.ENUM('admin', 'normal'),
        defaultValue: 'normal'
    },
    // Si el usuario ha validado su teléfono
    validat: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // La API Key o Token de sesión actual
    api_key: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Aceptación de términos de servicio
    tos: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = User;
