const createResponse = (status, message, data = null) => {
    return {
        status: status,
        message: message,
        data: data
    };
};

module.exports = { createResponse };
