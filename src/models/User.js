// Modelo de Usuario (Tabla Users)
// Define la estructura de datos para usuarios del sistema
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Definir el modelo con Sequelize
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;


const User = sequelize.define('User', {
    // Nombre de usuario, usado para validación de usuarios móviles
    nickname: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Email único, usado para login de administrador
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true // Obligatoria para admins en este sprint
    },
    // Contraseña (solo para admin en este sprint) login
    password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Teléfono del usuario
    telefon: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Rol del usuario: 'admin' o 'normal'
    role: {
        type: DataTypes.ENUM('admin', 'normal'),
        defaultValue: 'normal',
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
User.beforeCreate(async (user) => {
    if (user.password) {
        user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
    }
});

User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
    }
});

module.exports = User;
