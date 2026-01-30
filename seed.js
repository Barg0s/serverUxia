require('dotenv').config();
const bcrypt = require('bcryptjs');
const sequelize = require('./database');
const Usuari = require('./models/Usuari');

(async () => {
  try {
    await sequelize.sync();
    const password = 'Admin123!'; // cámbialo si quieres
    const hash = await bcrypt.hash(password, 10);
    const [admin, created] = await Usuari.findOrCreate({
      where: { email: 'admin@example.com' },
      defaults: {
        nickname: 'admin',
        telefon: '+34 600 000 000',
        password: hash,
        role: 'admin'
      }
    });
    console.log('Admin creado/recuperado:', admin.email, 'password:', password);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
