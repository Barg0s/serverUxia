const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AnalysisRequest = sequelize.define('AnalysisRequest', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    imageId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    prompt: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    imageBase64: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = AnalysisRequest;
