const { User } = require('../models');
const { createResponse } = require('../utils/response');

// Middleware de Autenticación (Bearer Token)
// Se ejecuta antes de las rutas protegidas para verificar quién es el usuario.
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // 1. Verificar si existe la cabecera Authorization
    if (!authHeader) {
        return res.status(401).json(
            createResponse('ERROR', 'Es requereix la capçalera d\'autorització')
        );
    }

    // 2. Verificar formato "Bearer <TOKEN>"
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json(
            createResponse('ERROR', 'Format d\'autorització invàlid')
        );
    }

    const token = authHeader.substring(7); // Extraer el token quitando "Bearer "

    // 3. Buscar el usuario en la BD que tenga esa API Key
    try {
        const user = await User.findOne({ where: { api_key: token } });

        if (!user) {
            return res.status(401).json(
                createResponse('ERROR', 'Token invàlid')
            );
        }

        // 4. Si es válido, guardamos el usuario en la petición (req.user)
        // para que las siguientes funciones puedan usarlo.
        req.user = user;
        next(); // Continuar con la siguiente función (la ruta)
    } catch (error) {
        console.error(error);
        return res.status(500).json(createResponse('ERROR', 'Error Intern del Servidor'));
    }
};

module.exports = { authMiddleware };
