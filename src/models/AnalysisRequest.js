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
        allowNull: true // Could be a path or a UUID for the stored image
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = AnalysisRequest;
