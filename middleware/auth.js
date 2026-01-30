const Usuari = require('../models/Usuari');

async function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  const createResponse = (status, message, data = null) => ({ status, message, data });

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json(createResponse('ERROR', "Es requereix la capçalera d'autorització"));
  }

  const token = header.substring(7);

  try {
    const user = await Usuari.findOne({ where: { apiKey: token } });
    if (!user) return res.status(401).json(createResponse('ERROR', 'Token invàlid'));

    // attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json(createResponse('ERROR', 'Error intern en autenticació'));
  }
}

module.exports = authMiddleware;
