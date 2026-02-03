const sequelize = require('../config/database');
const User = require('./User');
const AnalysisRequest = require('./AnalysisRequest');
const Response = require('./Response');

// Associations
User.hasMany(AnalysisRequest, { foreignKey: 'userId' });
AnalysisRequest.belongsTo(User, { foreignKey: 'userId' });

AnalysisRequest.hasOne(Response, { foreignKey: 'requestId' });
Response.belongsTo(AnalysisRequest, { foreignKey: 'requestId' });

const db = {
    sequelize,
    User,
    AnalysisRequest,
    Response
};

module.exports = db;
