const express = require('express');
const router = express.Router();
const Usuari = require('../models/Usuari');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const auth = require('../middleware/auth');

const createResponse = (status, message, data = null) => ({ status, message, data });

// POST /api/admin/usuaris/login
router.post('/usuaris/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json(createResponse('ERROR', 'email i password són requerits'));

  try {
    const user = await Usuari.findOne({ where: { email } });
    if (!user) return res.status(401).json(createResponse('ERROR', 'Credencials invàlides'));

    const match = await bcrypt.compare(password, user.password || '');
    if (!match) return res.status(401).json(createResponse('ERROR', 'Credencials invàlides'));

    if (user.role !== 'admin') return res.status(403).json(createResponse('ERROR', 'Accés no autoritzat'));

    const token = crypto.randomBytes(24).toString('hex');
    user.apiKey = token;
    await user.save();

    return res.json(createResponse('OK', 'Usuari autenticat correctament', { token }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(createResponse('ERROR', 'Error intern'));
  }
});

// GET /api/admin/usuaris  (protegido, solo admins)
router.get('/usuaris', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json(createResponse('ERROR', 'No és administrador'));
    const users = await Usuari.findAll({ attributes: ['nickname','email','telefon','role','createdAt','validat'] });
    return res.json(createResponse('OK', 'Consulta realitzada correctament', users));
  } catch (err) {
    console.error(err);
    return res.status(500).json(createResponse('ERROR', 'Error intern'));
  }
});

module.exports = router;
