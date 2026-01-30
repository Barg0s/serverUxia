require('dotenv').config();
const express = require('express');
const app = express();
const sequelize = require('./database');

app.use(express.json({ limit: '50mb' })); // subir límite por imágenes base64

// importa modelos para registrar definiciones
const Usuari = require('./models/Usuari');
const PeticioAnalisi = require('./models/PeticioAnalisi');
const Resposta = require('./models/Resposta');

// asociaciones
Usuari.hasMany(PeticioAnalisi);
PeticioAnalisi.belongsTo(Usuari);

PeticioAnalisi.hasOne(Resposta);
Resposta.belongsTo(PeticioAnalisi);

// routes
const adminRoutes = require('./routes/admin');
const peticionsRoutes = require('./routes/peticions');

app.use('/api/admin', adminRoutes);
app.use('/api/peticions', peticionsRoutes);

// simple health check
app.get('/', (req, res) => res.send('UXIA NodeJS API running'));

// sincroniza DB y arranca server
const PORT = process.env.PORT || 3000;
(async () => {
  try {
    await sequelize.sync({ alter: true }); // usa alter en dev para crear/actualizar tablas
    app.listen(PORT, () => console.log(`Servidor ejecutando en http://localhost:${PORT}`));
  } catch (err) {
    console.error('Error arrancando la BD:', err);
  }
})();
