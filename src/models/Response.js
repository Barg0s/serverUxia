const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Response = sequelize.define('Response', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tags: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    model_used: {
        type: DataTypes.STRING,
        allowNull: true
    },
    processing_time: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = Response;
